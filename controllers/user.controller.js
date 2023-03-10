const catchAsync = require("../helper/catchAsync");
const appError = require("../helper/errorHandlers/errorHandler");
const { ErrorMessage, SuccessMessage } = require("../helper/message");
const User = require("../models/user.model");
const Task = require("../models/task.model");
const Project = require("../models/project.model")
const { ErrorCode, SuccessCode } = require("../helper/statusCode");
const {
  compareHash,
  generateToken,
  generatePassword,
  randomPassword,
  generateHash,
  subjects,
  messages,
} = require("../helper/commonFunction");
const helper = require("../helper/commonResponseHandler");
const { sendMail, sendMailNotify } = require("../utils/nodeMailer/nodemailer");
const {
  getOneUser,
  getAllUser,
  getUserById,
  getUserAndUpdate,
  getOneToken,
  createUser,
} = require("../services/user.service");

const { getTask } = require("../services/task.service");

const enums = require("../helper/enum/enums");

module.exports = {
  //******************************** common login api for manager developer admin ************************** */
  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const loggedInUser = await getOneUser({
      email,
      role: {
        $in: [
          enums.declaredEnum.role.MANAGER,
          enums.declaredEnum.role.DEVELOPER,
          enums.declaredEnum.role.ADMIN,
        ],
      },
      status: { $ne: enums.declaredEnum.status.DELETE },
    });
    if (!loggedInUser || !compareHash(password, loggedInUser.password)) {
      throw new appError(
        ErrorMessage.EMAIL_NOT_REGISTERED,
        ErrorCode.NOT_FOUND
      );
    } else {
      let token = generateToken({ id: loggedInUser._id });
      let finalRes = {
        email: email,
        mobile_number: loggedInUser.mobile_number,
        role: loggedInUser.role,
        first_name: loggedInUser.first_name,
        last_name: loggedInUser.last_name,
        token: token,
      };
      helper.sendResponseWithData(
        res,
        SuccessCode.SUCCESS,
        SuccessMessage.LOGIN_SUCCESS,
        finalRes
      );
    }
  }),

  // *********************************************** get profile for Manager,Developer *******************************

  getProfile: catchAsync(async (req, res) => {
    const tokenAuth = await getOneUser({
      _id: req.userId,
      role: {
        $in: [
          enums.declaredEnum.role.DEVELOPER,
          enums.declaredEnum.role.MANAGER,
        ],
      },
      status: { $ne: enums.declaredEnum.status.DELETE },
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

  updateProfile: catchAsync(async (req, res) => {
    let payload = req.body;
    const tokenAuth = await getOneUser({
      _id: req.userId,
      role: {
        $in: [
          enums.declaredEnum.role.DEVELOPER,
          enums.declaredEnum.role.MANAGER,
        ],
      },
      status: { $ne: enums.declaredEnum.status.DELETE },
    });
    if (!tokenAuth)
      helper.commonResponse(
        res,
        ErrorCode.NOT_FOUND,
        ErrorMessage.USER_NOT_FOUND
      );
    if (req.files.length !== 0) {
      payload["profile_image"] = req.files[0].location;
    }
    let updateRes = await getUserAndUpdate(
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
  }),

  // **************************************** Developer Create ************************

  addDeveloper: catchAsync(async (req, res) => {
    const payload = req.body;
    const { first_name, last_name, email, mobile_number } = payload;
    const userAuth = await getOneUser({
      _id: req.userId,
      role: enums.declaredEnum.role.MANAGER,
      status: enums.declaredEnum.status.ACTIVE,
    });
    if (!userAuth) {
      throw new appError(ErrorMessage.CANNOT_CREATE, ErrorCode.NOT_FOUND);
    }
    const userFound = await getOneUser({ email, mobile_number });
    if (userFound) {
      throw new appError(ErrorMessage.ALREADY_EXIST, ErrorCode.ALREADY_EXIST);
    }
    payload["employee_id"] = "DEV" + mobile_number.substr(-4);
    let passGen = randomPassword();
    console.log(passGen);
    payload["password"] = generateHash(passGen);
    payload["role"] = enums.declaredEnum.role.DEVELOPER;
    const createDeveloper = await createUser(payload);

    const subject = subjects(enums.declaredEnum.role.DEVELOPER);
    const message = messages(payload.email, passGen);

    await sendMailNotify(userAuth.email, subject, message, req.body.email);

    helper.sendResponseWithData(
      res,
      SuccessCode.SUCCESS,
      SuccessMessage.CREATE_DEVELOPER,
      createDeveloper
    );
  }),

  //*********************************** get the list of manager **************************** */

  listTheManager: catchAsync(async (req, res) => {
    const allAuthRes = await getOneUser({
      _id: req.userId,
      role: {
        $in: [enums.declaredEnum.role.MANAGER, enums.declaredEnum.role.ADMIN],
      },
    });
    if (!allAuthRes) {
      throw new appError(ErrorMessage.USER_NOT_FOUND, ErrorCode.NOT_FOUND);
    }

    var query = {
      status: { $ne: enums.declaredEnum.status.DELETE },
      role: enums.declaredEnum.role.MANAGER,
    };
    if (req.body.search) {
      query.name = new RegExp("^" + req.body.search, "i");
    }

    let { page, limit } = req.query;
    page = req.query.page || 1;
    limit = req.query.limit || 10;
    const userRes = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    if (userRes.length == 0) {
      throw new appError(ErrorMessage.DATA_NOT_FOUND, ErrorCode.NOT_FOUND);
    }
    let final = {
      user: userRes,
      currentPage: page,
    };
    helper.commonResponse(
      res,
      SuccessCode.SUCCESS,
      final,
      SuccessMessage.DATA_FOUND
    );
  }),

  //*********************************** get the list of developer **************************** */

  listTheDeveloper: catchAsync(async (req, res) => {
    const allAuthRes = await getOneUser({
      _id: req.userId,
      role: {
        $in: [enums.declaredEnum.role.DEVELOPER, enums.declaredEnum.role.ADMIN],
      },
      status: enums.declaredEnum.status.ACTIVE,
    });
    if (!allAuthRes) {
      throw new appError(ErrorMessage.USER_NOT_FOUND, ErrorCode.NOT_FOUND);
    }

    var query = {
      status: { $ne: enums.declaredEnum.status.DELETE },
      role: enums.declaredEnum.role.DEVELOPER,
    };
    if (req.body.search) {
      query.name = new RegExp("^" + req.body.search, "i");
    }

    let { page, limit } = req.query;
    page = req.query.page || 1;
    limit = req.query.limit || 10;
    const userRes = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    if (userRes.length == 0) {
      throw new appError(ErrorMessage.DATA_NOT_FOUND, ErrorCode.NOT_FOUND);
    }
    let final = {
      user: userRes,
      currentPage: page,
    };
    helper.commonResponse(
      res,
      SuccessCode.SUCCESS,
      final,
      SuccessMessage.DATA_FOUND
    );
  }),

  //************************* get task details of a praticular developer ************************ */

  getTaskOfPraticularDev: catchAsync(async (req, res) => {
    const devAuth = await getOneUser({
      _id: req.userId,
      role: enums.declaredEnum.role.DEVELOPER,
      status: enums.declaredEnum.status.ACTIVE,
    });
    if (!devAuth) {
      throw new appError(ErrorMessage.USER_NOT_FOUND, ErrorCode.NOT_FOUND);
    }
    var queryMade = { developer_assigned: { $in: devAuth._id } };
    if (req.body.search) {
      queryMade.name = new RegExp("^" + req.body.search, "i");
    }
    let { page, limit } = req.query;
    page = req.query.page || 1;
    limit = req.query.limit || 10;
    let taskOfDeveloper = await Task.find(queryMade)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await Task.find(queryMade).countDocuments();
    let final = {
      projects: taskOfDeveloper,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
    if (taskOfDeveloper.length == 0) {
      throw new appError(ErrorMessage.DATA_NOT_FOUND, ErrorCode.NOT_FOUND);
    }

    helper.commonResponse(
      res,
      SuccessCode.SUCCESS,
      final,
      SuccessMessage.DATA_FOUND
    );
  }),


  //********************************** get project details of a particular developer ************************ */

  myProjectList: catchAsync(async (req, res) => {
    let managerAuthCheck = await getOneUser({ _id: req.userId, role: enums.declaredEnum.role.MANAGER });
    if (!managerAuthCheck) throw new appError(ErrorMessage.MANAGER_NOT_EXIST, {}, ErrorCode.NOT_FOUND);
    var queryMade =  { manager: { $in: managerAuthCheck._id } };
    if (req.body.search) {
      queryMade.project_name = new RegExp("^" + req.body.search, "i");
    }
    let { page, limit } = req.query;
    page = req.query.page || 1;
    limit = req.query.limit || 10;
    let allprojectList = await Project.find(queryMade)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await Project.find(queryMade).countDocuments();
    let final = {
      projects: allprojectList,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };

    if (allprojectList.length == 0) {
      throw new appError(ErrorMessage.DATA_NOT_FOUND, ErrorCode.NOT_FOUND);
    }
    helper.commonResponse(res, SuccessCode.SUCCESS, final, SuccessMessage.PROJECT_ADDED);

  }),

};
