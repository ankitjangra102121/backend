const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      if (next) return next(err);
      console.error("Unhandled Error:", err);
    });
  };
};

export { asyncHandler };
