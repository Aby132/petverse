# AWS Cognito Setup Script for PetVerse (PowerShell)
# This script creates a complete Cognito User Pool with custom attributes and policies

param(
    [string]$Region = "us-east-1",
    [string]$UserPoolName = "petverse-users",
    [string]$ClientName = "petverse-web-client",
    [string]$ProjectName = "petverse"
)

Write-Host "🚀 Setting up AWS Cognito for PetVerse..." -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "User Pool Name: $UserPoolName" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI is not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Create User Pool
Write-Host "📝 Creating User Pool..." -ForegroundColor Yellow

$userPoolSchema = @'
[
    {
        "Name": "email",
        "AttributeDataType": "String",
        "Required": true,
        "Mutable": true
    },
    {
        "Name": "given_name",
        "AttributeDataType": "String",
        "Required": false,
        "Mutable": true
    },
    {
        "Name": "family_name",
        "AttributeDataType": "String",
        "Required": false,
        "Mutable": true
    },
    {
        "Name": "role",
        "AttributeDataType": "String",
        "Required": false,
        "Mutable": true,
        "DeveloperOnlyAttribute": false
    }
]
'@

$passwordPolicy = @'
{
    "PasswordPolicy": {
        "MinimumLength": 8,
        "RequireUppercase": true,
        "RequireLowercase": true,
        "RequireNumbers": true,
        "RequireSymbols": false
    }
}
'@

$verificationTemplate = @'
{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "Welcome to PetVerse! Your verification code is {####}",
    "EmailSubject": "PetVerse - Verify your email"
}
'@

$emailConfig = @'
{
    "EmailSendingAccount": "COGNITO_DEFAULT"
}
'@

$adminCreateConfig = @'
{
    "AllowAdminCreateUserOnly": false,
    "InviteMessageTemplate": {
        "EmailMessage": "Welcome to PetVerse! Your username is {username} and temporary password is {####}",
        "EmailSubject": "Welcome to PetVerse"
    }
}
'@

$UserPoolId = aws cognito-idp create-user-pool `
    --pool-name $UserPoolName `
    --region $Region `
    --policies $passwordPolicy `
    --auto-verified-attributes email `
    --username-attributes email `
    --schema $userPoolSchema `
    --verification-message-template $verificationTemplate `
    --email-configuration $emailConfig `
    --admin-create-user-config $adminCreateConfig `
    --user-pool-tags "Project=$ProjectName,Environment=development" `
    --query 'UserPool.Id' `
    --output text

Write-Host "✅ User Pool created: $UserPoolId" -ForegroundColor Green

# Create User Pool Client
Write-Host "📱 Creating User Pool Client..." -ForegroundColor Yellow

$ClientId = aws cognito-idp create-user-pool-client `
    --user-pool-id $UserPoolId `
    --client-name $ClientName `
    --region $Region `
    --no-generate-secret `
    --explicit-auth-flows USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH `
    --supported-identity-providers COGNITO `
    --callback-urls "http://localhost:3001/,https://localhost:3001/" `
    --logout-urls "http://localhost:3001/,https://localhost:3001/" `
    --allowed-o-auth-flows code `
    --allowed-o-auth-scopes email openid profile `
    --allowed-o-auth-flows-user-pool-client `
    --prevent-user-existence-errors ENABLED `
    --enable-token-revocation `
    --query 'UserPoolClient.ClientId' `
    --output text

Write-Host "✅ User Pool Client created: $ClientId" -ForegroundColor Green

# Create Identity Pool
Write-Host "🆔 Creating Identity Pool..." -ForegroundColor Yellow

$identityProviders = @"
[{
    "ProviderName": "cognito-idp.$Region.amazonaws.com/$UserPoolId",
    "ClientId": "$ClientId",
    "ServerSideTokenCheck": false
}]
"@

$IdentityPoolId = aws cognito-identity create-identity-pool `
    --identity-pool-name "$ProjectName-identity-pool" `
    --region $Region `
    --allow-unauthenticated-identities `
    --cognito-identity-providers $identityProviders `
    --query 'IdentityPoolId' `
    --output text

Write-Host "✅ Identity Pool created: $IdentityPoolId" -ForegroundColor Green

# Create IAM roles
Write-Host "👤 Creating IAM roles..." -ForegroundColor Yellow

$AuthenticatedRoleName = "$ProjectName-authenticated-role"
$UnauthenticatedRoleName = "$ProjectName-unauthenticated-role"

$authenticatedAssumeRolePolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "cognito-identity.amazonaws.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "cognito-identity.amazonaws.com:aud": "$IdentityPoolId"
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated"
                }
            }
        }
    ]
}
"@

$unauthenticatedAssumeRolePolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "cognito-identity.amazonaws.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "cognito-identity.amazonaws.com:aud": "$IdentityPoolId"
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "unauthenticated"
                }
            }
        }
    ]
}
"@

# Create authenticated role
aws iam create-role `
    --role-name $AuthenticatedRoleName `
    --assume-role-policy-document $authenticatedAssumeRolePolicy | Out-Null

# Create unauthenticated role
aws iam create-role `
    --role-name $UnauthenticatedRoleName `
    --assume-role-policy-document $unauthenticatedAssumeRolePolicy | Out-Null

Write-Host "✅ IAM roles created" -ForegroundColor Green

# Get role ARNs
$AuthenticatedRoleArn = aws iam get-role --role-name $AuthenticatedRoleName --query 'Role.Arn' --output text
$UnauthenticatedRoleArn = aws iam get-role --role-name $UnauthenticatedRoleName --query 'Role.Arn' --output text

# Set Identity Pool roles
Write-Host "🔗 Setting Identity Pool roles..." -ForegroundColor Yellow

aws cognito-identity set-identity-pool-roles `
    --identity-pool-id $IdentityPoolId `
    --roles "authenticated=$AuthenticatedRoleArn,unauthenticated=$UnauthenticatedRoleArn" `
    --region $Region

Write-Host "✅ Identity Pool roles configured" -ForegroundColor Green

# Create admin user
Write-Host "👨‍💼 Creating admin user..." -ForegroundColor Yellow

aws cognito-idp admin-create-user `
    --user-pool-id $UserPoolId `
    --username "admin@petverse.com" `
    --user-attributes "Name=email,Value=admin@petverse.com" "Name=given_name,Value=Admin" "Name=family_name,Value=User" "Name=custom:role,Value=admin" `
    --temporary-password "TempPass123!" `
    --message-action SUPPRESS `
    --region $Region | Out-Null

# Set permanent password for admin
aws cognito-idp admin-set-user-password `
    --user-pool-id $UserPoolId `
    --username "admin@petverse.com" `
    --password "Admin123!" `
    --permanent `
    --region $Region

Write-Host "✅ Admin user created: admin@petverse.com / Admin123!" -ForegroundColor Green

# Output configuration
Write-Host ""
Write-Host "🎉 AWS Cognito setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration Details:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor White
Write-Host "User Pool ID: $UserPoolId" -ForegroundColor White
Write-Host "User Pool Client ID: $ClientId" -ForegroundColor White
Write-Host "Identity Pool ID: $IdentityPoolId" -ForegroundColor White
Write-Host ""
Write-Host "👤 Test Admin Account:" -ForegroundColor Cyan
Write-Host "Email: admin@petverse.com" -ForegroundColor White
Write-Host "Password: Admin123!" -ForegroundColor White
Write-Host "Role: admin" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update src/aws-config.js with the above values" -ForegroundColor White
Write-Host "2. Switch from MockAuthContext to AuthContext in src/App.js" -ForegroundColor White
Write-Host "3. Test the authentication with the admin account" -ForegroundColor White
Write-Host ""

# Save configuration to file
$config = @{
    region = $Region
    userPoolId = $UserPoolId
    userPoolClientId = $ClientId
    identityPoolId = $IdentityPoolId
    adminUser = @{
        email = "admin@petverse.com"
        password = "Admin123!"
        role = "admin"
    }
}

$config | ConvertTo-Json -Depth 3 | Out-File -FilePath "cognito-config.json" -Encoding UTF8

Write-Host "💾 Configuration saved to: cognito-config.json" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 To update your app configuration, run:" -ForegroundColor Cyan
Write-Host "   node scripts/update-config.js" -ForegroundColor White
