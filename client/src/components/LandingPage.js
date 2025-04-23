import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = ({ apiStatus, refreshApiStatus }) => {
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [foods, setFoods] = useState([]);
  const [showQuote, setShowQuote] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [gamePaused, setGamePaused] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const gameAreaRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const difficultyTimerRef = useRef(null);

  // Gordon Ramsay's iconic scolding quotes
  const ramsayQuotes = [
    "IT'S RAW! You donkey!",
    "Where's the lamb sauce?! You're cooking in a dream world!",
    "This food is so undercooked it's still running around the field!",
    "I've never, ever, ever, ever met someone I believe in as little as you.",
    "My gran could do better! And she's dead!",
    "This chicken is so raw it's still asking why it crossed the road!",
    "This squid is so undercooked I can still hear it telling Spongebob to F**K OFF!",
    "You put so much oil in this pan the U.S. wants to invade it!",
    "There's enough garlic in here to kill every vampire in EUROPE!",
    "This fish is so raw it's still finding Nemo!",
    "This pizza is so disgusting, if you take it to Italy you'll get arrested!",
    "You're donut! An idiot sandwich!",
    "This crab is so undercooked it's still singing 'Under the Sea'!",
    "This beef is so raw it's eating the salad!",
    "The chicken is so raw that a skilled vet could still save it!",
    "This risotto is so undercooked, Gordon Ramsay is still running around looking for the rice!",
    "Do me a favor, shut your pie hole!",
    "I wouldn't trust you running a bath, let alone a restaurant!",
    "This is a really tough decision... because you're both crap!",
    "Your food tastes like garbage! Absolute garbage!"
  ];

  // Foods for the game (healthy and unhealthy)
  const foodItems = [
    { name: 'Apple', emoji: '🍎', image: 'apple.png', isHealthy: true },
    { name: 'Broccoli', emoji: '🥦', image: 'broccoli.png', isHealthy: true },
    { name: 'Carrot', emoji: '🥕', image: 'carrot.png', isHealthy: true },
    { name: 'Spinach', emoji: '🥬', image: 'spinach.png', isHealthy: true },
    { name: 'Chicken', emoji: '🍗', image: 'chicken.png', isHealthy: true },
    { name: 'Fish', emoji: '🐟', image: 'fish.png', isHealthy: true },
    { name: 'Eggs', emoji: '🥚', image: 'eggs.png', isHealthy: true },
    { name: 'Nuts', emoji: '🥜', image: 'nuts.png', isHealthy: true },
    { name: 'Avocado', emoji: '🥑', image: 'avocado.png', isHealthy: true },
    { name: 'Berries', emoji: '🫐', image: 'berries.png', isHealthy: true },
    { name: 'Burger', emoji: '🍔', image: 'burger.png', isHealthy: false },
    { name: 'Pizza', emoji: '🍕', image: 'pizza.png', isHealthy: false },
    { name: 'Fries', emoji: '🍟', image: 'fries.png', isHealthy: false },
    { name: 'Donut', emoji: '🍩', image: 'donut.png', isHealthy: false },
    { name: 'Cake', emoji: '🍰', image: 'cake.png', isHealthy: false },
    { name: 'Ice Cream', emoji: '🍦', image: 'ice-cream.png', isHealthy: false },
    { name: 'Soda', emoji: '🥤', image: 'soda.png', isHealthy: false },
    { name: 'Candy', emoji: '🍬', image: 'candy.png', isHealthy: false },
    { name: 'Hot Dog', emoji: '🌭', image: 'hot-dog.png', isHealthy: false },
    { name: 'Chips', emoji: '🍪', image: 'chips.png', isHealthy: false }
  ];

  // Start game function
  const startGame = () => {
    setGameActive(true);
    setGamePaused(false);
    setScore(0);
    setTimeLeft(30);
    setFoods([]);
    setDifficulty(1);
    
    // Start timer
    startTimer();
    
    // Start spawning foods
    startFoodSpawning();
    
    // Set up difficulty progression - increase difficulty faster
    difficultyTimerRef.current = setInterval(() => {
      setDifficulty(prev => Math.min(prev + 1, 5));
    }, 6000); // Increase difficulty every 6 seconds (changed from 12 seconds)
  };

  // Start timer function
  const startTimer = () => {
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerIntervalRef.current);
          clearInterval(gameIntervalRef.current);
          setGameActive(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  // Start food spawning function
  const startFoodSpawning = () => {
    clearInterval(gameIntervalRef.current);
    // Spawn interval decreases as difficulty increases - made faster overall
    const spawnInterval = Math.max(600 - (difficulty * 100), 200);
    gameIntervalRef.current = setInterval(spawnFood, spawnInterval);
  };

  // Stop game function
  const stopGame = () => {
    clearInterval(timerIntervalRef.current);
    clearInterval(gameIntervalRef.current);
    clearInterval(difficultyTimerRef.current);
    setGameActive(false);
    setGamePaused(false);
  };

  // Pause game function
  const pauseGame = () => {
    clearInterval(timerIntervalRef.current);
    clearInterval(gameIntervalRef.current);
    setGamePaused(true);
  };

  // Resume game function
  const resumeGame = () => {
    if (gameActive) {
      setGamePaused(false);
      startTimer();
      startFoodSpawning();
    }
  };

  // Spawn a new food item at random position
  const spawnFood = () => {
    if (!gameAreaRef.current) return;
    
    // Determine how many food items to spawn (1-3 based on difficulty)
    const maxSpawn = Math.min(difficulty, 3);
    const spawnCount = Math.floor(Math.random() * maxSpawn) + 1;
    
    for (let i = 0; i < spawnCount; i++) {
      const gameArea = gameAreaRef.current.getBoundingClientRect();
      const randomFood = foodItems[Math.floor(Math.random() * foodItems.length)];
      const id = Date.now() + i; // Ensure unique ID
      
      const maxX = gameArea.width - 80; // 80px is the food item size (updated from 60px)
      const maxY = gameArea.height - 80;
      
      const newFood = {
        ...randomFood,
        id,
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY),
        rotation: Math.floor(Math.random() * 360)
      };
      
      setFoods(prevFoods => [...prevFoods, newFood]);
      
      // Remove food after 2 seconds if not clicked (faster at higher difficulty)
      const disappearTime = Math.max(2000 - ((difficulty - 1) * 200), 1000);
      setTimeout(() => {
        setFoods(prevFoods => prevFoods.filter(food => food.id !== id));
      }, disappearTime);
    }
  };

  // Handle food click
  const handleFoodClick = (food) => {
    // Remove the clicked food
    setFoods(prevFoods => prevFoods.filter(f => f.id !== food.id));
    
    if (food.isHealthy) {
      // Increase score for healthy food
      setScore(prevScore => prevScore + 10);
    } else {
      // Show Ramsay quote for unhealthy food
      const randomQuote = ramsayQuotes[Math.floor(Math.random() * ramsayQuotes.length)];
      setCurrentQuote(randomQuote);
      setShowQuote(true);
      
      // Pause the game while showing the quote
      pauseGame();
      
      // Hide quote after 4 seconds and resume game
      setTimeout(() => {
        setShowQuote(false);
        resumeGame();
      }, 4000);
    }
  };

  // Update spawn rate when difficulty changes
  useEffect(() => {
    if (gameActive && !gamePaused) {
      startFoodSpawning();
    }
  }, [difficulty, gameActive, gamePaused]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(gameIntervalRef.current);
      clearInterval(difficultyTimerRef.current);
    };
  }, []);

  // Handle API status refresh with visual feedback
  const handleRefreshApiStatus = async () => {
    setIsRefreshing(true);
    await refreshApiStatus();
    // Add a small delay to make the refresh action more noticeable
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="landing-page">
      <div className="container">
        <div className="hero-section">
          <div className="hero-content">
            <h1><span className="highlight">Prep-Pal</span> from Hell</h1>
            <p>A Gordon Ramsay-inspired fitness & nutrition app that's as brutal as it is effective!</p>
            <div className="hero-buttons">
              <Link to="/profile" className="btn btn-primary">Create Your Profile</Link>
              <Link to="/recipe-extractor" className="btn btn-secondary">Explore Recipes</Link>
            </div>
          </div>
        </div>
        
        <div className="game-section">
          <div className="game-header">
            <h2>Food Ninja Challenge</h2>
            <p>Click on the healthy foods. Avoid the junk food or face Chef Ramsay's wrath!</p>
          </div>
          
          <div className="game-controls">
            {!gameActive ? (
              <button onClick={startGame} className="btn btn-primary">Start Game</button>
            ) : (
              <button onClick={stopGame} className="btn btn-secondary">End Game</button>
            )}
            <div className="game-stats">
              <div className="stat">
                <span>Score:</span> 
                <span className="stat-value">{score}</span>
              </div>
              <div className="stat">
                <span>Time Left:</span> 
                <span className="stat-value">{timeLeft}s</span>
              </div>
            </div>
          </div>
          
          <div className={`game-area ${gamePaused ? 'game-paused' : ''}`} ref={gameAreaRef}>
            {foods.map(food => (
              <div
                key={food.id}
                className="food-item"
                style={{
                  left: `${food.x}px`,
                  top: `${food.y}px`,
                  transform: `rotate(${food.rotation}deg)`
                }}
                onClick={() => handleFoodClick(food)}
              >
                <span role="img" aria-label={food.name}>{food.emoji}</span>
              </div>
            ))}
            
            {!gameActive && !timeLeft && (
              <div className="game-over">
                <h3>Game Over!</h3>
                <p>Your score: {score}</p>
                <button onClick={startGame} className="btn btn-primary">Play Again</button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* API Status indicator */}
      <div className="api-status">
        <div className="api-status-header">
          <h4>API Status</h4>
          <button 
            onClick={handleRefreshApiStatus} 
            className={`btn btn-refresh ${isRefreshing ? 'refreshing' : ''}`}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${apiStatus.openai === 'Connected' ? 'connected' : apiStatus.openai === 'Checking...' ? 'checking' : 'disconnected'}`}></div>
          <span>OpenAI API: {apiStatus.openai}</span>
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${apiStatus.youtube === 'Connected' ? 'connected' : apiStatus.youtube === 'Checking...' ? 'checking' : 'disconnected'}`}></div>
          <span>YouTube API: {apiStatus.youtube}</span>
        </div>
      </div>
      
      {/* Gordon Ramsay quote popup */}
      {showQuote && (
        <>
          <div className="overlay"></div>
          <div className="ramsay-quote-popup">
            "{currentQuote}"
          </div>
        </>
      )}
    </div>
  );
};

export default LandingPage;