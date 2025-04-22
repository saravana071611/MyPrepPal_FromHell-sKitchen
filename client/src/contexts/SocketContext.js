import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../utils/socket';

// Create a context for the socket
const SocketContext = createContext(null);

// Custom hook to use the socket context
export const useSocket = () => useContext(SocketContext);

// Socket provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  // Connect to the socket server when the component mounts
  useEffect(() => {
    // Initialize the socket connection
    const socketInstance = socketService.connect();
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketService.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 