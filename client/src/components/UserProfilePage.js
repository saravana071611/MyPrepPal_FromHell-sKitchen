import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import ReactMarkdown from 'react-markdown';
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
  const [activePersona, setActivePersona] = useState('gordon'); // 'gordon' or 'rock'

  // Function to extract sections from the assessment
  const extractSections = () => {
    if (!assessment) return { gordon: '', rock: '', full: '' };
    
    // Check if both sections exist
    const hasGordon = assessment.includes('**GORDON RAMSAY:**');
    const hasRock = assessment.includes('**THE ROCK:**');
    const hasMacros = assessment.includes('**MACRO GOALS:**');
    
    let gordonSection = '';
    let rockSection = '';
    let fullAssessment = assessment;
    
    // Extract Gordon's section
    if (hasGordon && hasRock) {
      // If both sections exist, extract between Gordon and Rock
      gordonSection = assessment.split('**GORDON RAMSAY:**')[1].split('**THE ROCK:**')[0].trim();
    } else if (hasGordon) {
      // If only Gordon exists, extract from Gordon to end or to macro goals
      gordonSection = hasMacros 
        ? assessment.split('**GORDON RAMSAY:**')[1].split('**MACRO GOALS:**')[0].trim()
        : assessment.split('**GORDON RAMSAY:**')[1].trim();
    }
    
    // Extract Rock's section
    if (hasRock && hasMacros) {
      // If Rock and macro goals exist, extract between Rock and Macro Goals
      rockSection = assessment.split('**THE ROCK:**')[1].split('**MACRO GOALS:**')[0].trim();
    } else if (hasRock) {
      // If only Rock exists without macro goals, extract from Rock to the end
      rockSection = assessment.split('**THE ROCK:**')[1].trim();
    }
    
    // Full assessment without macro goals
    if (hasMacros) {
      fullAssessment = assessment.split('**MACRO GOALS:**')[0].trim();
    }
    
    // If Rock's section is empty or very short, generate a default one
    if (rockSection.length < 30 && gordonSection) {
      console.log('Generating default Rock section due to missing content');
      
      // Get weight goal from Gordon's section
      const isWeightLoss = gordonSection.toLowerCase().includes('lose weight') || 
                           gordonSection.toLowerCase().includes('losing weight') ||
                           gordonSection.toLowerCase().includes('weight loss');
      
      // Create a default Rock section with more specific workout instructions
      rockSection = `FOCUS. DISCIPLINE. CONSISTENCY. These aren't just words - they're your new lifestyle.

YOUR WEEKLY WORKOUT SCHEDULE:
• Monday: PUSH - Chest/shoulders/triceps - 4×10 reps, 60sec rest
• Tuesday: 35min HIIT cardio + core (4 rounds of 45sec work/15sec rest)
• Wednesday: PULL - Back/biceps - 4×10 reps, 60sec rest
• Thursday: Active recovery - 30min walk + stretching
• Friday: LEGS - Squats/lunges/deadlifts - 4×10 reps, 75sec rest
• Saturday: 45min steady cardio + mobility work
• Sunday: FULL REST (but meal prep for the week!)

THE BOTTOM LINE: Train 5-6 days/week. Progressive overload - add weight or reps each week. Track EVERYTHING. ${isWeightLoss ? "You didn't gain this weight overnight, and you won't lose it overnight." : "Building quality muscle takes time and consistency."} COMMIT to the process!`;
    }
    
    // Log for debugging
    console.log('Extracted sections:', { 
      hasGordon, 
      hasRock, 
      hasMacros,
      gordonLength: gordonSection.length,
      rockLength: rockSection.length,
      usedFallback: rockSection.length < 30
    });
    
    return { 
      gordon: gordonSection, 
      rock: rockSection,
      full: fullAssessment
    };
  };

  // Toggle between Gordon and The Rock
  const togglePersona = () => {
    setActivePersona(activePersona === 'gordon' ? 'rock' : 'gordon');
  };

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
      
      // Convert macro goals to numbers if they're strings
      const cleanedMacroGoals = { ...assessmentResponse.data.macroGoals };
      if (cleanedMacroGoals) {
        Object.keys(cleanedMacroGoals).forEach(key => {
          // Convert empty strings or non-numeric values to default numbers
          if (!cleanedMacroGoals[key] || isNaN(Number(cleanedMacroGoals[key]))) {
            const defaults = { protein: 130, carbs: 150, fats: 60, calories: 1800 };
            cleanedMacroGoals[key] = defaults[key] || 0;
          } else {
            // Convert strings to numbers
            cleanedMacroGoals[key] = Number(cleanedMacroGoals[key]);
          }
        });
      }
      
      setAssessment(assessmentResponse.data.assessment);
      setMacroGoals(cleanedMacroGoals);
      
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
        
        // Check if it's a timeout issue
        if (error.code === 'ECONNABORTED') {
          setError('Request timed out. The server is taking too long to respond. Please try again later.');
        } else {
          setError('Failed to submit profile: No response from server. Please check your connection.');
        }
      } else if (error.code === 'ECONNRESET') {
        // Handle connection reset errors
        console.error('Connection reset error details:', error);
        setError(`Connection reset by the server. This usually happens when the server crashed during processing. 
                 Please try again or contact support if the issue persists.`);
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
                    className={`rock-avatar ${activePersona === 'rock' ? 'active' : ''}`}
                    onClick={() => setActivePersona('rock')}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                  <img 
                    src="/images/gordon-ramsay.jpg" 
                    alt="Gordon Ramsay" 
                    className={`ramsay-avatar ${activePersona === 'gordon' ? 'active' : ''}`}
                    onClick={() => setActivePersona('gordon')}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <h2>Your Fitness Assessment</h2>
                <div className="persona-toggle">
                  <button 
                    className={`toggle-btn ${activePersona === 'gordon' ? 'active' : ''}`} 
                    onClick={() => setActivePersona('gordon')}
                  >
                    Gordon Ramsay
                  </button>
                  <button 
                    className={`toggle-btn ${activePersona === 'rock' ? 'active' : ''}`} 
                    onClick={() => setActivePersona('rock')}
                  >
                    The Rock
                  </button>
                </div>
              </div>
              
              <div className="assessment-content">
                {activePersona === 'gordon' ? (
                  <div className="persona-section gordon-section">
                    <h3 className="persona-heading">GORDON RAMSAY</h3>
                    <div className="markdown-content">
                      <ReactMarkdown>{extractSections().gordon}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="persona-section rock-section">
                    <h3 className="persona-heading">THE ROCK</h3>
                    <div className="markdown-content">
                      <ReactMarkdown>{extractSections().rock}</ReactMarkdown>
                    </div>
                    {extractSections().rock.length < 10 && (
                      <div className="missing-content">
                        <p>
                          The Rock is busy in the gym right now. Try refreshing or generating a new assessment.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {macroGoals && (
                <div className="macro-goals">
                  <h3>Your Recommended Macro Goals</h3>
                  <div className="macro-goals-grid">
                    <div className="macro-goal-item">
                      <span className="macro-label">Protein</span>
                      <span className="macro-value">{macroGoals.protein || 0}g</span>
                    </div>
                    <div className="macro-goal-item">
                      <span className="macro-label">Carbs</span>
                      <span className="macro-value">{macroGoals.carbs || 0}g</span>
                    </div>
                    <div className="macro-goal-item">
                      <span className="macro-label">Fats</span>
                      <span className="macro-value">{macroGoals.fats || 0}g</span>
                    </div>
                    <div className="macro-goal-item">
                      <span className="macro-label">Calories</span>
                      <span className="macro-value">{macroGoals.calories || 0}</span>
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