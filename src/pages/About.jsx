import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  const teamMembers = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Chief Veterinarian',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&h=300',
      bio: '15+ years of veterinary experience specializing in small animal care.',
      specialties: ['Surgery', 'Internal Medicine', 'Emergency Care']
    },
    {
      name: 'Mike Chen',
      role: 'Pet Nutrition Expert',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&h=300',
      bio: 'Certified animal nutritionist helping pets live healthier lives.',
      specialties: ['Nutrition Planning', 'Diet Consultation', 'Weight Management']
    },
    {
      name: 'Emily Rodriguez',
      role: 'Animal Behaviorist',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b332c1c2?auto=format&fit=crop&w=300&h=300',
      bio: 'Specialized in pet training and behavioral modification.',
      specialties: ['Training', 'Behavior Analysis', 'Socialization']
    },
  ];

  const stats = [
    { number: '50,000+', label: 'Happy Pet Owners', icon: '👥' },
    { number: '100,000+', label: 'Pets Helped', icon: '🐾' },
    { number: '500+', label: 'Partner Vets', icon: '🏥' },
    { number: '24/7', label: 'Support Available', icon: '💬' },
  ];

  const values = [
    {
      title: 'Pet-First Approach',
      description: 'Every decision we make prioritizes the health and happiness of your beloved pets.',
      icon: '❤️'
    },
    {
      title: 'Expert Knowledge',
      description: 'Our team of veterinarians and pet care experts provide reliable, science-based advice.',
      icon: '🎓'
    },
    {
      title: 'Community Driven',
      description: 'We believe in building a supportive community of pet lovers who help each other.',
      icon: '🤝'
    },
    {
      title: 'Innovation',
      description: 'We leverage technology to make pet care more accessible and convenient for everyone.',
      icon: '🚀'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            About PetVerse 🐾
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
            We're passionate about connecting pet owners with the resources, products, and expert advice 
            they need to give their furry friends the best life possible.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                At PetVerse, we believe every pet deserves exceptional care. Our mission is to make 
                professional pet care advice, quality products, and essential services accessible to 
                pet owners everywhere.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Whether you're a first-time pet owner or a seasoned animal lover, we're here to 
                support you with expert guidance, innovative tools, and a caring community.
              </p>
              <Link to="/chatbot">
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
                  🤖 Try Our AI Assistant
                </button>
              </Link>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&h=400"
                alt="Happy pets"
                className="rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-accent-500 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-3xl mb-2">🏆</div>
                <p className="font-semibold">Trusted by</p>
                <p className="text-2xl font-bold">50,000+</p>
                <p className="text-sm">Pet Families</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-3">{stat.icon}</div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Our Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do at PetVerse.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{value.icon}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Meet Our Expert Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our passionate team of veterinarians and pet care specialists are here to help you and your pets.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-display font-bold text-gray-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-primary-600 font-semibold mb-3">{member.role}</p>
                  <p className="text-gray-600 mb-4">{member.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {member.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-secondary-500 to-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Ready to Give Your Pet the Best Care?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of pet owners who trust PetVerse for expert advice, quality products, and caring support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                Get Started Today
              </button>
            </Link>
            <Link to="/discover">
              <button className="bg-white hover:bg-gray-100 text-primary-600 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                🗺️ Find Local Services
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
