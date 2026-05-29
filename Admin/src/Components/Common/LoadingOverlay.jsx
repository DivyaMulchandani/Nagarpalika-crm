import React from 'react';

const LoadingOverlay = ({ fullScreen = false }) => {
  const overlayStyle = {
    position: fullScreen ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000
  };

  const spinnerWrapperStyle = {
    textAlign: 'center'
  };

  const textStyle = {
    color: '#fff',
    marginTop: '10px',
    fontWeight: '500'
  };

  return (
    <div style={overlayStyle}>
      <div style={spinnerWrapperStyle}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div style={textStyle}>Loading...</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;