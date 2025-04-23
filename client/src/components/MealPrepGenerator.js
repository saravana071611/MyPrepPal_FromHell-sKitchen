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
    } else if (id === 'instructions') {
      formattedContent = formatCookingInstructions(content);
    } else {
      // For other sections, just format paragraphs
      formattedContent = formatParagraphs(content);
    }
    
    return (
      <div className="meal-prep-section" id={id}>
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
    
    // Replace headers with formatted h4 elements
    let formatted = content
      .replace(/^([A-Z][A-Za-z\s]+):$/gm, '<h4>$1:</h4>')
      .replace(/^([A-Z][A-Za-z\s]+)\s*$/gm, '<h4>$1</h4>');

    // Convert plain dash/bullet lists to proper HTML lists
    const lines = formatted.split('\n');
    let inList = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is a list item
      if (line.match(/^[-•*]\s+(.+)$/)) {
        // If we're not already in a list, start one
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        
        // Add the list item
        const itemContent = line.replace(/^[-•*]\s+(.+)$/, '$1');
        result.push(`<li>${itemContent}</li>`);
      } else {
        // If we're exiting a list
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        
        // Add the non-list line
        if (line) {
          result.push(`<p>${line}</p>`);
        } else {
          result.push(''); // empty line
        }
      }
    }
    
    // Close the list if we're still in one
    if (inList) {
      result.push('</ul>');
    }
    
    return result.join('\n');
  };
  
  // Function to format cooking instructions as ordered list
  const formatCookingInstructions = (content) => {
    if (!content) return '';
    
    // Extract any ingredients section and move it to grocery list
    const ingredientsMatch = content.match(/ingredients:([^]*?)(?=\n\s*\n|\n\s*step|\n\s*[0-9]+\.|\n\s*cooking|$)/i);
    
    // Remove ingredients section from instructions if found
    let cleanedContent = content;
    if (ingredientsMatch && ingredientsMatch[1]) {
      cleanedContent = content.replace(ingredientsMatch[0], '');
    }

    // Convert numeric steps to ordered list
    const lines = cleanedContent.split('\n');
    let inList = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is a numeric step
      if (line.match(/^[0-9]+\.\s+(.+)$/)) {
        // If we're not already in a list, start one
        if (!inList) {
          result.push('<ol>');
          inList = true;
        }
        
        // Add the list item
        const stepContent = line.replace(/^[0-9]+\.\s+(.+)$/, '$1');
        result.push(`<li>${stepContent}</li>`);
      } else {
        // If we're exiting a list
        if (inList && (line === '' || line.match(/^[A-Z].*:$/))) {
          result.push('</ol>');
          inList = false;
        }
        
        // Add the non-list line
        if (line) {
          if (line.match(/^[A-Z].*:$/)) {
            result.push(`<h4>${line}</h4>`);
          } else {
            result.push(`<p>${line}</p>`);
          }
        } else if (result.length > 0) {
          result.push(''); // empty line only if there's already content
        }
      }
    }
    
    // Close the list if we're still in one
    if (inList) {
      result.push('</ol>');
    }
    
    return result.join('\n');
  };

  return (
    <div className="meal-prep-container">
      <div className="meal-prep-header">
        <h2>Gordon Ramsay's Meal Prep Plan</h2>
        <p className="subtitle">5 Portions for Your Week, Optimized for Nutrition and Flavor</p>
      </div>
      
      <div className="meal-prep-content">
        {renderSection("Recipe Feedback", mealPrepData.feedback, "feedback")}
        
        <div className="meal-prep-two-column">
          <div className="meal-prep-column">
            {renderSection("Grocery List (5 Portions)", mealPrepData.groceryList, "grocery-list")}
            {renderSection("Macronutrient Information", mealPrepData.macros, "macros")}
          </div>
          
          <div className="meal-prep-column">
            {renderSection("Cooking Instructions", mealPrepData.instructions, "instructions")}
            {renderSection("Storage & Reheating", mealPrepData.storage, "storage")}
          </div>
        </div>
        
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