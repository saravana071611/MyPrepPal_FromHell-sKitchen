import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
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
  const [macroGoals, setMacroGoals] = useState(null);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Reset form on component mount
  useEffect(() => {
    resetForm();
  }, []);

  // Reset form function
  const resetForm = () => {
    setFormData({
      age: '',
      gender: '',
      currentWeight: '',
      currentHeight: '',
      activityLevel: '',
      targetWeight: ''
    });
    setAssessment('');
    setMacroGoals(null);
    setError('');
    setFormErrors({});
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.age) errors.age = 'Age is required';
    else if (formData.age < 1 || formData.age > 120) errors.age = 'Age must be between 1 and 120';
    
    if (!formData.gender) errors.gender = 'Gender is required';
    
    if (!formData.currentWeight) errors.currentWeight = 'Current weight is required';
    else if (formData.currentWeight < 20 || formData.currentWeight > 300) 
      errors.currentWeight = 'Weight must be between 20 and 300 kg';
    
    if (!formData.currentHeight) errors.currentHeight = 'Current height is required';
    else if (formData.currentHeight < 50 || formData.currentHeight > 250)
      errors.currentHeight = 'Height must be between 50 and 250 cm';
    
    if (!formData.activityLevel) errors.activityLevel = 'Activity level is required';
    
    if (!formData.targetWeight) errors.targetWeight = 'Target weight is required';
    else if (formData.targetWeight < 20 || formData.targetWeight > 300)
      errors.targetWeight = 'Target weight must be between 20 and 300 kg';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Submitting profile data:', { userId, ...formData });
      
      // First, save user profile
      const profileResponse = await apiClient.saveUserProfile({
        userId,
        ...formData
      });
      
      console.log('Profile saved:', profileResponse.data);
      
      // Save userId to localStorage for use in the RecipeExtractorPage
      localStorage.setItem('userId', userId);
      
      // Then, get AI assessment
      const assessmentResponse = await apiClient.getFitnessAssessment({
        userId, // Pass userId to update profile with macro goals
        ...formData
      });
      
      console.log('Assessment received:', assessmentResponse.data);
      
      setAssessment(assessmentResponse.data.assessment);
      setMacroGoals(assessmentResponse.data.macroGoals);
      
    } catch (error) {
      console.error('Error submitting profile:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        setError(`Failed to submit profile: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        setError('Failed to submit profile: No response from server. Please check your connection.');
      } else if (error.code === 'ECONNRESET') {
        // Handle connection reset errors
        setError('The connection to the server was reset. This might be due to a timeout. Please try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        setError(`Failed to submit profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>Your Fitness Profile</h1>
          <p>Enter your details below to get a personalized fitness assessment from The Rock & Gordon Ramsay!</p>
        </div>
        
        <div className="profile-content">
          <div className="profile-form-container">
            <form onSubmit={handleSubmit} className="profile-form">
              <div className={`form-group ${formErrors.age ? 'has-error' : ''}`}>
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
                />
                {formErrors.age && <div className="error-feedback">{formErrors.age}</div>}
              </div>
              
              <div className={`form-group ${formErrors.gender ? 'has-error' : ''}`}>
                <label htmlFor="gender" className="form-label">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  className="form-control"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
                {formErrors.gender && <div className="error-feedback">{formErrors.gender}</div>}
              </div>
              
              <div className={`form-group ${formErrors.currentWeight ? 'has-error' : ''}`}>
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
                />
                {formErrors.currentWeight && <div className="error-feedback">{formErrors.currentWeight}</div>}
              </div>
              
              <div className={`form-group ${formErrors.currentHeight ? 'has-error' : ''}`}>
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
                />
                {formErrors.currentHeight && <div className="error-feedback">{formErrors.currentHeight}</div>}
              </div>
              
              <div className={`form-group ${formErrors.activityLevel ? 'has-error' : ''}`}>
                <label htmlFor="activityLevel" className="form-label">Activity Level</label>
                <select
                  id="activityLevel"
                  name="activityLevel"
                  className="form-control"
                  value={formData.activityLevel}
                  onChange={handleChange}
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Lightly active (light exercise 1-3 days/week)</option>
                  <option value="moderate">Moderately active (moderate exercise 3-5 days/week)</option>
                  <option value="active">Very active (hard exercise 6-7 days/week)</option>
                  <option value="extreme">Extremely active (very hard exercise, physical job or training twice a day)</option>
                </select>
                {formErrors.activityLevel && <div className="error-feedback">{formErrors.activityLevel}</div>}
              </div>
              
              <div className={`form-group ${formErrors.targetWeight ? 'has-error' : ''}`}>
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
                />
                {formErrors.targetWeight && <div className="error-feedback">{formErrors.targetWeight}</div>}
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                  disabled={loading}
                >
                  Reset
                </button>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                >
                  {loading ? 'Getting Assessment...' : 'Get Assessment'}
                </button>
              </div>
              
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>
          
          {assessment && (
            <div className="assessment-container">
              <div className="assessment-header">
                <div className="personas">
                  <img 
                    src="/images/rock.jpg" 
                    alt="The Rock" 
                    className="rock-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                  <img 
                    src="/images/gordon-ramsay.jpg" 
                    alt="Gordon Ramsay" 
                    className="ramsay-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <h2>Your Fitness Assessment</h2>
              </div>
              <div className="assessment-content">
                {assessment.split('MACRO_GOALS:')[0]}
              </div>
              
              {macroGoals && (
                <div className="macro-goals">
                  <h3>Your Recommended Macro Goals</h3>
                  <div className="macro-goals-grid">
                    <div className="macro-goal-item">
                      <span className="macro-label">Protein</span>
                      <span className="macro-value">{macroGoals.protein}g</span>
                    </div>
                    <div className="macro-goal-item">
                      <span className="macro-label">Carbs</span>
                      <span className="macro-value">{macroGoals.carbs}g</span>
                    </div>
                    <div className="macro-goal-item">
                      <span className="macro-label">Fats</span>
                      <span className="macro-value">{macroGoals.fats}g</span>
                    </div>
                    <div className="macro-goal-item">
                      <span className="macro-label">Calories</span>
                      <span className="macro-value">{macroGoals.calories}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;