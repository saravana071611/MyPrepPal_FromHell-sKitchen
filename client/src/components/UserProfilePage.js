import React, { useState } from 'react';
import axios from 'axios';
import '../styles/UserProfilePage.css';

const UserProfilePage = () => {
  const [userId] = useState(`user_${Date.now()}`); // Simple user ID based on timestamp
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    currentWeight: '',
    currentHeight: '',
    activityLevel: '',
    targetWeight: ''
  });
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [error, setError] = useState('');

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // First, save user profile
      await axios.post('/api/user/profile', {
        userId,
        ...formData
      });
      
      // Then, get AI assessment
      const response = await axios.post('/api/openai/fitness-assessment', formData);
      
      setAssessment(response.data.assessment);
    } catch (error) {
      console.error('Error submitting profile:', error);
      setError('Failed to submit profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>Your Fitness Profile</h1>
          <p>Enter your details below to get a personalized fitness assessment from The Rock!</p>
        </div>
        
        <div className="profile-content">
          <div className="profile-form-container">
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="age" className="form-label">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  className="form-control"
                  value={formData.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="gender" className="form-label">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  className="form-control"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="currentWeight" className="form-label">Current Weight (kg)</label>
                <input
                  type="number"
                  id="currentWeight"
                  name="currentWeight"
                  className="form-control"
                  value={formData.currentWeight}
                  onChange={handleChange}
                  step="0.1"
                  min="20"
                  max="300"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="currentHeight" className="form-label">Current Height (cm)</label>
                <input
                  type="number"
                  id="currentHeight"
                  name="currentHeight"
                  className="form-control"
                  value={formData.currentHeight}
                  onChange={handleChange}
                  min="50"
                  max="250"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="activityLevel" className="form-label">Activity Level</label>
                <select
                  id="activityLevel"
                  name="activityLevel"
                  className="form-control"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Lightly active (light exercise 1-3 days/week)</option>
                  <option value="moderate">Moderately active (moderate exercise 3-5 days/week)</option>
                  <option value="active">Very active (hard exercise 6-7 days/week)</option>
                  <option value="extreme">Extremely active (very hard exercise, physical job or training twice a day)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="targetWeight" className="form-label">Target Weight (kg)</label>
                <input
                  type="number"
                  id="targetWeight"
                  name="targetWeight"
                  className="form-control"
                  value={formData.targetWeight}
                  onChange={handleChange}
                  step="0.1"
                  min="20"
                  max="300"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
              >
                {loading ? 'Getting Assessment...' : 'Get Assessment'}
              </button>
              
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>
          
          {assessment && (
            <div className="assessment-container">
              <div className="assessment-header">
                <img 
                  src="/images/rock.jpg" 
                  alt="The Rock" 
                  className="rock-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
                <h2>The Rock's Assessment</h2>
              </div>
              <div className="assessment-content">
                <p>{assessment}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;