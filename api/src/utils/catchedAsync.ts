module.exports = (fn) => {
  return function (req, res, next) {
    fn(req, res).catch((e) => {
      next(e);
    });
  };
};
