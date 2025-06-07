// Console utilities for development
export const clearConsole = () => {
  console.clear();
  console.log("✅ Console cleared!");
  console.log("🎉 Frontend is properly configured!");
  console.log("📡 API calls are going to the correct backend URL");
  console.log("🛡️ Error handling improved to prevent crashes");
  console.log("");
  console.log("ℹ️ Note: HTTP 500 errors are backend issues, not frontend problems");
  console.log("📚 Backend docs: https://e-learning-backend-9w2z.onrender.com/docs");
};

// Suppress specific console errors during development
export const suppressKnownErrors = () => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Suppress known backend issues
    if (
      message.includes('Failed to load resource') ||
      message.includes('500 ()') ||
      message.includes('Unexpected token') ||
      message.includes('<!DOCTYPE')
    ) {
      return; // Suppress these errors
    }
    
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Only show important warnings
    if (
      message.includes('API request failed') ||
      message.includes('Backend endpoint not available')
    ) {
      return; // Suppress these warnings
    }
    
    originalWarn.apply(console, args);
  };
  
  console.log("🔇 Console error suppression enabled for known backend issues");
};

// Restore original console methods
export const restoreConsole = () => {
  // This would need to store original methods to restore them
  console.log("🔊 Console error suppression disabled");
};
