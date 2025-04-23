import React from 'react';
import '../styles/MealPrepGenerator.css';

// Component to display meal prep information
const MealPrepGenerator = ({ mealPrepData }) => {
  // Return early if no data is available
  if (!mealPrepData) {
    return null;
  }

  // Function to render a section with a formatted content
  const renderSection = (title, content, id) => {
    if (!content) return null;
    
    // Format the content based on section type
    let formattedContent = content;
    
    // Special handling for different sections
    if (id === 'grocery-list') {
      formattedContent = formatGroceryList(content);
    } else if (id === 'cooking-method') {
      formattedContent = formatCookingInstructions(content);
    } else {
      // For other sections, just format paragraphs
      formattedContent = formatParagraphs(content);
    }
    
    return (
      <div className="meal-prep-section wide-section" id={id}>
        <h3>{title}</h3>
        <div 
          className="section-content"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
      </div>
    );
  };
  
  // Function to format paragraphs
  const formatParagraphs = (content) => {
    if (!content) return '';
    
    // Simple paragraph formatting
    return content
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `<p>${line}</p>`)
      .join('');
  };
  
  // Function to format grocery list with better structure
  const formatGroceryList = (content) => {
    if (!content) return '';
    
    // Remove any HTML tags that might be in the content already
    let cleanedContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    
    // Split content into lines
    const lines = cleanedContent.split('\n');
    let groceryItems = [];
    
    // Extract grocery list items (numbered items)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a numbered item (starts with a number followed by period)
      if (line.match(/^\d+\.\s+.+/)) {
        // Extract just the item text without the number
        const itemText = line.replace(/^\d+\.\s+/, '');
        groceryItems.push(itemText);
      }
    }
    
    // If we found grocery items, create a proper ordered list
    if (groceryItems.length > 0) {
      // Create HTML for ordered list
      return '<ol>\n' + 
        groceryItems.map(item => `  <li>${item}</li>`).join('\n') +
        '\n</ol>';
    }
    
    // Fallback to original content if no numbered items found
    return '<p>' + cleanedContent.replace(/\n/g, '</p><p>') + '</p>';
  };
  
  // Function to format cooking instructions as ordered list
  const formatCookingInstructions = (content) => {
    if (!content) return '';
    
    // Remove any HTML tags that might be in the content already
    let cleanedContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    
    // Split content into lines
    const lines = cleanedContent.split('\n');
    let instructionItems = [];
    
    // Extract actual instruction steps (numbered items)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a numbered instruction (starts with a number followed by period)
      if (line.match(/^\d+\.\s+.+/)) {
        // Extract just the instruction text without the number
        const instructionText = line.replace(/^\d+\.\s+/, '');
        instructionItems.push(instructionText);
      }
    }
    
    // If we found instruction items, create a proper ordered list
    if (instructionItems.length > 0) {
      // Create HTML for ordered list
      return '<ol>\n' + 
        instructionItems.map(item => `  <li>${item}</li>`).join('\n') +
        '\n</ol>';
    }
    
    // Fallback to original content if no numbered items found
    return '<p>' + cleanedContent.replace(/\n/g, '</p><p>') + '</p>';
  };

  return (
    <div className="meal-prep-container">
      <div className="meal-prep-header">
        <h2>Gordon Ramsay's Meal Prep Plan</h2>
        <p className="subtitle">5 Portions for Your Week, Optimized for Nutrition and Flavor</p>
      </div>
      
      <div className="meal-prep-content">
        {renderSection("Grocery List (5 Portions)", mealPrepData.groceryList, "grocery-list")}
        {renderSection("Cooking Method", mealPrepData.cookingMethod, "cooking-method")}
        
        <div className="meal-prep-actions">
          <button className="print-button" onClick={() => window.print()}>
            Print Meal Prep Plan
          </button>
          <button 
            className="save-button"
            onClick={() => {
              const content = JSON.stringify(mealPrepData, null, 2);
              const blob = new Blob([content], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `meal-prep-plan-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Save as JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealPrepGenerator;