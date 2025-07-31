const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const indexRouter = require('./routes/index');
const enquiriesRouter = require('./routes/enquiries');
const nosEnquiriesRouter = require('./routes/nos/enquiries');
const aisEnquiriesRouter = require('./routes/ais/enquiries');
const app = express();
const corsOptions = {
  origin: ["http://localhost:3000","https://nationaloutdoorschool.com","https://aisthetic.co"],
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// view engine setup
app.use(logger('dev'));
app.use(express.json());
//allow cors whitelisted domains

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/enquiries', enquiriesRouter);
app.use('/nos/enquiries', nosEnquiriesRouter);
app.use('/ais/enquiries', aisEnquiriesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
