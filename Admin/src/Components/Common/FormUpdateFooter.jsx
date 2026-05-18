import React from "react";

const FormUpdateFooter = ({ handleUpdate, handleUpdateCancel, isLoading = false }) => {
  return (
    <React.Fragment>
      <div className="hstack gap-2 justify-content-end">
        <button
          type="submit"
          className="btn btn-success"
          id="add-btn"
          onClick={handleUpdate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Updating...
            </>
          ) : "Update"}
        </button>

        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={handleUpdateCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </React.Fragment>
  );
};

export default FormUpdateFooter;
