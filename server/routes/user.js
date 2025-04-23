const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Directory to store user profiles
const PROFILES_DIR = path.join(__dirname, '../data/profiles');

// Function to clear all profiles - used on server start
const clearAllProfiles = () => {
  try {
    if (fs.existsSync(PROFILES_DIR)) {
      const files = fs.readdirSync(PROFILES_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(PROFILES_DIR, file));
      }
      console.log('All user profiles cleared on server start');
    }
  } catch (error) {
    console.error('Error clearing profiles directory:', error);
  }
};

// Clear profiles on module load (server start)
clearAllProfiles();

// Ensure profiles directory exists
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

// Route to clear all profiles (for admin or testing purposes)
router.delete('/profiles/clear', (req, res) => {
  try {
    clearAllProfiles();
    res.json({ 
      success: true, 
      message: 'All user profiles cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing profiles:', error);
    res.status(500).json({ error: 'Failed to clear profiles' });
  }
});

// Route to save user profile
router.post('/profile', (req, res) => {
  try {
    const { userId, age, gender, currentWeight, currentHeight, activityLevel, targetWeight } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log('[UserProfile] Saving profile for user:', userId);
    
    const userProfile = {
      userId,
      age: parseInt(age) || null,
      gender: gender || null,
      currentWeight: parseFloat(currentWeight) || null,
      currentHeight: parseFloat(currentHeight) || null,
      activityLevel: activityLevel || null,
      targetWeight: parseFloat(targetWeight) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Make sure the profiles directory exists
    if (!fs.existsSync(PROFILES_DIR)) {
      console.log('[UserProfile] Creating profiles directory');
      fs.mkdirSync(PROFILES_DIR, { recursive: true });
    }
    
    const filePath = path.join(PROFILES_DIR, `${userId}.json`);
    console.log('[UserProfile] Writing to file:', filePath);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(userProfile, null, 2));
      console.log('[UserProfile] File written successfully');
      
      // Verify the file was written
      if (fs.existsSync(filePath)) {
        console.log('[UserProfile] File exists after write');
      } else {
        console.log('[UserProfile] WARNING: File does not exist after write!');
      }
    } catch (writeError) {
      console.error('[UserProfile] Error writing file:', writeError);
      throw writeError;
    }
    
    res.json({ 
      success: true, 
      message: 'User profile saved successfully',
      profile: userProfile
    });
  } catch (error) {
    console.error('Error saving user profile:', error);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
});

// Route to get user profile
router.get('/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const filePath = path.join(PROFILES_DIR, `${userId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const userProfileRaw = fs.readFileSync(filePath, 'utf8');
    const userProfile = JSON.parse(userProfileRaw);
    
    res.json(userProfile);
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Route to update user profile
router.put('/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { age, gender, currentWeight, currentHeight, activityLevel, targetWeight } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const filePath = path.join(PROFILES_DIR, `${userId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    // Get existing profile
    const userProfileRaw = fs.readFileSync(filePath, 'utf8');
    const existingProfile = JSON.parse(userProfileRaw);
    
    // Update profile with new values
    const updatedProfile = {
      ...existingProfile,
      age: parseInt(age) || existingProfile.age,
      gender: gender || existingProfile.gender,
      currentWeight: parseFloat(currentWeight) || existingProfile.currentWeight,
      currentHeight: parseFloat(currentHeight) || existingProfile.currentHeight,
      activityLevel: activityLevel || existingProfile.activityLevel,
      targetWeight: parseFloat(targetWeight) || existingProfile.targetWeight,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedProfile, null, 2));
    
    res.json({ 
      success: true, 
      message: 'User profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;