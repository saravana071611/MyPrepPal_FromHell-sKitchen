import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
// Change import to require for axios to fix Jest issue
const axios = require('axios');
import UserProfilePage from '../UserProfilePage';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key]),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('UserProfilePage Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    axios.post.mockClear();
    localStorageMock.setItem.mockClear();
    
    // Setup default mock responses
    axios.post.mockImplementation((url) => {
      if (url === '/api/user/profile') {
        return Promise.resolve({
          data: {
            success: true,
            message: 'User profile saved successfully',
            profile: {
              userId: 'test_user_123',
              age: 30,
              gender: 'male',
              currentWeight: 80,
              currentHeight: 180,
              activityLevel: 'moderate',
              targetWeight: 75
            }
          }
        });
      } else if (url === '/api/openai/fitness-assessment') {
        return Promise.resolve({
          data: {
            assessment: `THE ROCK:
            Great stats! You're on the right track.
            
            GORDON RAMSAY:
            Cut the junk food now!
            
            MACRO_GOALS:
            Protein: 160 grams per day
            Carbs: 200 grams per day
            Fats: 60 grams per day
            Calories: 2000 calories per day`,
            macroGoals: {
              protein: 160,
              carbs: 200,
              fats: 60,
              calories: 2000
            }
          }
        });
      }
      return Promise.reject(new Error('Not mocked'));
    });
  });

  // TEST 1: Can capture form field entries and save them properly
  test('captures form field entries and saves them correctly', async () => {
    render(<UserProfilePage />);
    
    // Complete the form
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/Current Height/i), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText(/Activity Level/i), { target: { value: 'moderate' } });
    fireEvent.change(screen.getByLabelText(/Target Weight/i), { target: { value: '75' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Wait for the API calls to complete
    await waitFor(() => {
      // Check if first API call was made correctly
      expect(axios.post).toHaveBeenCalledTimes(2);
      
      // Verify the profile API call
      const profileCall = axios.post.mock.calls.find(call => call[0] === '/api/user/profile');
      expect(profileCall).toBeTruthy();
      
      // Extract the data sent to the API
      const sentData = profileCall[1];
      
      // Verify all form fields were captured and sent correctly
      expect(sentData).toMatchObject({
        age: '30',
        gender: 'male',
        currentWeight: '80',
        currentHeight: '180',
        activityLevel: 'moderate',
        targetWeight: '75'
      });
      
      // Verify userId was generated and included
      expect(sentData.userId).toBeTruthy();
      
      // Verify userId was saved to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userId', sentData.userId);
    });
  });

  // TEST 2: Creates the correct prompt for OpenAI API
  test('creates the correct prompt for the OpenAI API', async () => {
    render(<UserProfilePage />);
    
    // Complete the form with specific test values
    const testData = {
      age: '35',
      gender: 'female',
      currentWeight: '70',
      currentHeight: '165',
      activityLevel: 'light',
      targetWeight: '65'
    };
    
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: testData.age } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: testData.gender } });
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: testData.currentWeight } });
    fireEvent.change(screen.getByLabelText(/Current Height/i), { target: { value: testData.currentHeight } });
    fireEvent.change(screen.getByLabelText(/Activity Level/i), { target: { value: testData.activityLevel } });
    fireEvent.change(screen.getByLabelText(/Target Weight/i), { target: { value: testData.targetWeight } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Wait for the API calls to complete
    await waitFor(() => {
      // Check if OpenAI API call was made
      const openaiCall = axios.post.mock.calls.find(call => call[0] === '/api/openai/fitness-assessment');
      expect(openaiCall).toBeTruthy();
      
      // Extract the data sent to the API
      const sentData = openaiCall[1];
      
      // Verify all form fields were included correctly in the OpenAI request
      expect(sentData).toMatchObject(testData);
      
      // Verify userId was generated and included
      expect(sentData.userId).toBeTruthy();
    });
  });

  // TEST 3: Captures and displays the OpenAI API response correctly
  test('captures and displays the OpenAI API response correctly', async () => {
    render(<UserProfilePage />);
    
    // Complete the form
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/Current Height/i), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText(/Activity Level/i), { target: { value: 'moderate' } });
    fireEvent.change(screen.getByLabelText(/Target Weight/i), { target: { value: '75' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Wait for the API calls to complete and the UI to update
    await waitFor(() => {
      // Verify the assessment is displayed
      expect(screen.getByText(/THE ROCK:/i)).toBeInTheDocument();
      expect(screen.getByText(/GORDON RAMSAY:/i)).toBeInTheDocument();
      
      // Check if the macro goals are displayed correctly
      expect(screen.getByText('160g')).toBeInTheDocument(); // Protein
      expect(screen.getByText('200g')).toBeInTheDocument(); // Carbs
      expect(screen.getByText('60g')).toBeInTheDocument();  // Fats
      expect(screen.getByText('2000')).toBeInTheDocument(); // Calories
      
      // Verify the assessment header is displayed
      expect(screen.getByText('Your Fitness Assessment')).toBeInTheDocument();
      expect(screen.getByText('Your Recommended Macro Goals')).toBeInTheDocument();
    });
  });

  // TEST 4: Validates form fields correctly
  test('validates form fields correctly', async () => {
    render(<UserProfilePage />);
    
    // Submit the empty form
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Check that validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText('Age is required')).toBeInTheDocument();
      expect(screen.getByText('Gender is required')).toBeInTheDocument();
      expect(screen.getByText('Current weight is required')).toBeInTheDocument();
      expect(screen.getByText('Current height is required')).toBeInTheDocument();
      expect(screen.getByText('Activity level is required')).toBeInTheDocument();
      expect(screen.getByText('Target weight is required')).toBeInTheDocument();
    });
    
    // Enter invalid values
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '150' } }); // Too high
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: '400' } }); // Too high
    fireEvent.change(screen.getByLabelText(/Current Height/i), { target: { value: '30' } }); // Too low
    
    // Submit the form with invalid values
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Check that validation errors for invalid values are displayed
    await waitFor(() => {
      expect(screen.getByText('Age must be between 1 and 120')).toBeInTheDocument();
      expect(screen.getByText('Weight must be between 20 and 300 kg')).toBeInTheDocument();
      expect(screen.getByText('Height must be between 50 and 250 cm')).toBeInTheDocument();
    });
    
    // Verify no API calls were made due to validation errors
    expect(axios.post).not.toHaveBeenCalled();
  });

  // TEST 5: Handles API errors gracefully
  test('handles API errors gracefully', async () => {
    // Mock API error response
    axios.post.mockImplementationOnce(() => Promise.reject({
      response: {
        data: { error: 'Failed to save profile' },
        status: 500
      }
    }));
    
    render(<UserProfilePage />);
    
    // Complete the form
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/Current Height/i), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText(/Activity Level/i), { target: { value: 'moderate' } });
    fireEvent.change(screen.getByLabelText(/Target Weight/i), { target: { value: '75' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to submit profile/i)).toBeInTheDocument();
    });
  });

  // TEST 6: Reset button clears the form
  test('reset button clears the form and assessment', async () => {
    render(<UserProfilePage />);
    
    // Complete the form
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Current Weight/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/Current Height/i), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText(/Activity Level/i), { target: { value: 'moderate' } });
    fireEvent.change(screen.getByLabelText(/Target Weight/i), { target: { value: '75' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Get Assessment'));
    
    // Wait for assessment to display
    await waitFor(() => {
      expect(screen.getByText(/THE ROCK:/i)).toBeInTheDocument();
    });
    
    // Click reset button
    fireEvent.click(screen.getByText('Reset'));
    
    // Check that form is cleared
    expect(screen.getByLabelText(/Age/i).value).toBe('');
    expect(screen.getByLabelText(/Gender/i).value).toBe('');
    expect(screen.getByLabelText(/Current Weight/i).value).toBe('');
    expect(screen.getByLabelText(/Current Height/i).value).toBe('');
    expect(screen.getByLabelText(/Activity Level/i).value).toBe('');
    expect(screen.getByLabelText(/Target Weight/i).value).toBe('');
    
    // Check that assessment is no longer displayed
    expect(screen.queryByText(/THE ROCK:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GORDON RAMSAY:/i)).not.toBeInTheDocument();
  });
}); 