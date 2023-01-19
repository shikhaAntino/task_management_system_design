const User = require("../models/user.model");
const Token = require("../models/token.model");
const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/errorHandlers/errorHandler");
const { ErrorMessage, SuccessMessage } = require("../helper/message");
const { ErrorCode, SuccessCode } = require("../helper/statusCode");
const {
  compareHash,
  generateToken,
  generatePassword,
  randomPassword,
  generateHash,
} = require("../helper/commonFunction");
const helper = require("../helper/commonResponseHandler");
const {
  sendMail,
  sendMailNotify,
} = require("../services/nodeMailer/nodemailer");

const {subjects,messages}=require('../helper/commonFunction');

module.exports = {
  // *************************************************** manager login ******************************************
  loginManager: async (req, res) => {
    try {
      const { email, password } = req.body;
      const loggedInUser = await User.findOne({ email });
      if (!loggedInUser || !compareHash(password, loggedInUser.password)) {
        throw new appError(
          ErrorMessage.EMAIL_NOT_REGISTERED,
          ErrorCode.NOT_FOUND
        );
      } else {
        let token = generateToken({ id: loggedInUser._id });
        let managerRes = {
          email: email,
          first_name: loggedInUser.first_name,
          last_name: loggedInUser.last_name,
          role: loggedInUser.role,
          mobile_number: loggedInUser.mobile_number,
          employee_id: loggedInUser.employee_id,
          token: token,
        };
        helper.sendResponseWithData(
          res,
          SuccessCode.SUCCESS,
          SuccessMessage.LOGIN_SUCCESS,
          managerRes
        );
      }
    } catch (error) {
      helper.commonResponse(
        res,
        ErrorCode.SOMETHING_WRONG,
        ErrorMessage.SOMETHING_WRONG
      );
    }
  },

  // *********************************************** get profile for Manager,Developer *******************************

  getProfile: catchAsync(async (req, res) => {
    const tokenAuth = await User.findOne({
      _id: req.userId,
      role: { $in: ["Developer", "Manager"] },
    });
    if (!tokenAuth) {
      throw new appError(ErrorMessage.DATA_NOT_FOUND, ErrorCode.NOT_FOUND);
    }
    helper.commonResponse(
      res,
      SuccessCode.SUCCESS,
      tokenAuth,
      SuccessMessage.DATA_FOUND
    );
  }),
  // *********************************************** update Profile for Manager,Developer *******************************

  updateProfile: async (req, res) => {
    try {
      let payload = req.body;
      const tokenAuth = await User.findOne({
        _id: req.userId,
        role: { $in: ["Developer", "Manager"] },
      });
      if (!tokenAuth)
        helper.commonResponse(
          res,
          ErrorCode.NOT_FOUND,
          ErrorMessage.USER_NOT_FOUND
        );
      if (req.files) {
        payload["profile_pic"] = req.files[0].location;
      }
      let updateRes = await User.findByIdAndUpdate(
        { _id: tokenAuth._id },
        { $set: payload },
        { new: true }
      );
      helper.commonResponse(
        res,
        SuccessCode.SUCCESS,
        updateRes,
        SuccessMessage.UPDATE_SUCCESS
      );
    } catch (error) {
      helper.commonResponse(
        res,
        ErrorCode.SOMETHING_WRONG,
        ErrorMessage.SOMETHING_WRONG
      );
    }
  },

  // **************************************** Developer Create ************************

  addDeveloper: catchAsync(async (req, res) => {
    // const payload = req.body;
    const { first_name, last_name, email, mobile_number } = req.body;
    const checkManager = await User.findById({ _id: req.userId, role: "Manager" });
    if (!checkManager) {
      throw new appError(ErrorMessage.NOT_AUTHORISED, ErrorCode.NOT_FOUND);
    }
    const user = await User.findOne({ email, mobile_number });
    if (user) {
      throw new appError(ErrorMessage.ALREADY_EXIST, ErrorCode.ALREADY_EXIST);
    }
    req.body["employee_id"] = "DEV" + mobile_number.substr(-4);
    let passGen = randomPassword();
    console.log(passGen);
    req.body["password"] = generateHash(passGen);
    req.body["role"] = "Developer";
    const createDeveloper = await User.create(req.body);

    await sendMailNotify(checkManager.email, subjects.DEVELOPER, messages(req.body.email,passGen) ,email);

    helper.sendResponseWithData(
      res,
      SuccessCode.SUCCESS,
      SuccessMessage.CREATE_DEVELOPER,
      createDeveloper
    );
  }),
  

  // **************************************************** Developer Login ************************

  developerLogin: async (req, res) => {
    try {
      const { email, password } = req.body;
      let developerDetails = await User.findOne({ email });
      if (!developerDetails)
        helper.commonResponse(
          res,
          ErrorCode.NOT_FOUND,
          ErrorMessage.USER_NOT_FOUND
        );
      else if (!compareHash(password, developerDetails.password))
        helper.commonResponse(
          res,
          ErrorCode.NOT_FOUND,
          ErrorMessage.INVALID_CREDENTIAL
        );
      const token = generateToken({
        id: developerDetails._id,
        role: developerDetails.role,
      });
      let loginRes = {
        email: email,
        role: developerDetails.role,
        token: token,
        first_name: developerDetails.first_name,
        last_name: developerDetails.last_name,
      };
      helper.commonResponse(
        res,
        SuccessCode.SUCCESS,
        loginRes,
        SuccessMessage.DATA_FOUND
      );
    } catch (error) {
      helper.commonResponse(
        res,
        ErrorCode.SOMETHING_WRONG,
        ErrorMessage.SOMETHING_WRONG
      );
    }
  },
};
