import React from "react";


const FormsFooter = ({ handleSubmit, handleSubmitCancel, isLoading = false }) => {
  return (
    <React.Fragment>
      <div className="hstack gap-2 justify-content-end">
        <button
          type="submit"
          className="btn btn-success"
          id="add-btn"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Submitting...
            </>
          ) : "Submit"}
        </button>
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={handleSubmitCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </React.Fragment>
  );
};

export default FormsFooter;
