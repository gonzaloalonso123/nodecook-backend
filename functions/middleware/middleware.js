const logRequest = (req, res, next) => {
  const reqUrl = req.url;
  console.log(
    `${req.method} ${reqUrl}`,
    new Date().toTimeString().split(" ")[0]
  );
  next();
};

module.exports = { logRequest };
