const User = require("../models/user.model");
const task = require("../models/task.model");
const project = require("../models/project.model");
const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/errorHandlers/errorHandler");
const { ErrorMessage, SuccessMessage } = require("../helper/message");
const { ErrorCode, SuccessCode } = require("../helper/statusCode");
const { compareHash, generateToken, generatePassword, randomPassword, generateHash } = require("../helper/commonFunction");
const helper = require("../helper/commonResponseHandler");
const { sendMail, sendMailNotify } = require("../services/nodeMailer/nodemailer");

module.exports = {

    addTaskToProject: catchAsync(async (req, res) => {
        const { projectId, name, type, priority, start_date, due_date } = req.body;
        const managerAuth = await User.findOne({ _id: req.userId, role: "Manager" });
        if (!managerAuth) helper.commonResponse(res, ErrorCode.NOT_FOUND, ErrorMessage.USER_NOT_FOUND);

        const projectRes = await project.findOne({ _id: projectId });
        if (!projectRes) helper.commonResponse(res, ErrorCode.NOT_FOUND, ErrorMessage.DATA_NOT_FOUND)

        req.body.manager = managerAuth._id;
        req.body.projectId = projectRes._id;

        let taskRes = await task.create(req.body);
        helper.commonResponse(res, SuccessCode.SUCCESS, taskRes, SuccessMessage.TASK_ADD)

    }),

    listTaskOnparticularProject: catchAsync(async (req, res) => {
        const { _id } = req.body;
        if (req.body.search) {
            query.name = new RegExp("^" + req.body.search, "i");
        }
        const allAuthRes = await User.findOne({ _id: req.userId });
        if (!allAuthRes) helper.commonResponse(res, ErrorCode.NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
        const projectFindRes = await project.findOne({ _id: _id });
        if (!projectFindRes) helper.commonResponse(res, ErrorCode.NOT_FOUND, ErrorMessage.DATA_NOT_FOUND);
        var options = {
            page: req.body.page || 1,
            limit: req.body.limit || 10,
            sort: { createdAt: -1 },
            populate: "projectId manager "
        };
        let query = { projectId: projectFindRes._id }
        const taskListRes = await task.paginate(query, options);
        if (taskListRes.length == 0) helper.commonResponse(res, ErrorCode.NOT_FOUND, ErrorMessage.DATA_NOT_FOUND);
        helper.commonResponse(res, SuccessCode.SUCCESS, taskListRes, SuccessMessage.DATA_FOUND)
    }),

    addDeveloperToTask: catchAsync(async (req, res) => {
        let { developers, taskId } = req.body;
        const managerAuthCheck = await User.findOne({ _id: req.userId });
        if (managerAuthCheck && managerAuthCheck.role != "Manager") {
          throw new appError(ErrorMessage.INVALID_TOKEN, ErrorCode.NOT_ALLOWED);
        } else if (!managerAuthCheck) {
            throw new appError(ErrorMessage.MANAGER_NOT_EXIST, ErrorCode.NOT_FOUND);
        }
        let developerCheckRes = await User.findOne({_id:developers});
        if (!developerCheckRes) helper.commonResponse(res, ErrorCode.NOT_FOUND, ErrorMessage.USER_NOT_FOUND)

        const taskCheckRes = await task.findById(taskId);
        if (taskCheckRes && taskCheckRes.active_status == "DELETE") {
            throw new appError(ErrorMessage.PROJECT_DELETED, ErrorCode.NOT_FOUND);
        } else if (!taskCheckRes) {
            throw new appError(ErrorMessage.PROJECT_NOT_EXIST, ErrorCode.NOT_FOUND);
        }
        const newProject = await task.findOneAndUpdate({ _id: taskId }, { $addToSet: { developer_assigned: developers } }, { new: true })
        helper.commonResponse(res,SuccessCode.SUCCESS,newProject,SuccessMessage.DEVELOPER_ASSIGNED );


    }),


};
