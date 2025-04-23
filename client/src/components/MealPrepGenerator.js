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
    
    // Replace headers with formatted h4 elements
    let formatted = content
      .replace(/^([A-Z][A-Za-z\s]+):$/gm, '<h4>$1:</h4>')
      .replace(/^([A-Z][A-Za-z\s]+)\s*$/gm, '<h4>$1</h4>');

    // Convert plain dash/bullet lists to proper HTML lists
    const lines = formatted.split('\n');
    let result = ['<ol>'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a numbered item (e.g. "1. 2 chicken breasts")
      if (line.match(/^\d+\.\s+.+/)) {
        // Extract just the item text without the number
        const itemContent = line.replace(/^\d+\.\s+/, '');
        result.push(`<li>${itemContent}</li>`);
      } 
      // Check if this line is a bullet list item
      else if (line.match(/^[-•*]\s+(.+)$/)) {
        // Extract just the item text without the bullet
        const itemContent = line.replace(/^[-•*]\s+(.+)$/, '$1');
        result.push(`<li>${itemContent}</li>`);
      } 
      // Check if line is a header or category
      else if (line.match(/<h4>/)) {
        // Close the current list before adding the header
        result.push('</ol>');
        // Add the header
        result.push(line);
        // Start a new list
        result.push('<ol>');
      }
      // Regular text
      else if (line) {
        // For non-list text, add as a paragraph outside the list
        result.push(`</ol><p>${line}</p><ol>`);
      }
    }
    
    // Close the final list
    result.push('</ol>');
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

    // Split content into lines and process
    const lines = cleanedContent.split('\n');
    let result = ['<ol>'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is a numbered step (matches "1. Some instruction")
      if (line.match(/^\d+\.\s+.+/)) {
        // Extract the instruction text without the number
        const instructionText = line.replace(/^\d+\.\s+/, '');
        // Add as a list item
        result.push(`<li>${instructionText}</li>`);
      } else if (line) {
        // For non-empty, non-numbered lines, add as a paragraph
        // This handles section headers or other notes in the instructions
        result.push(`</ol><p>${line}</p><ol>`);
      }
    }
    
    result.push('</ol>');
    return result.join('\n');
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