const router = require("express").Router();
const adminController = require("../../controllers/admin.controller");
const auth = require('../../middleware/auth');
const {validationMiddleware}=require("../../middleware/joeValidator")
const { updateAdminValidation,createmanager, resetPasswordAdmin,forgetPasswordAdmin, statusChangeByAdmin, userDeleteByAdmin } = require("../../validator/admin.validator");
const { upload } = require("../../utils/aws/aws");
const { resetPassword, forgetPassword, createManager,getAdminDetails ,updateAdmin,listAllUsers,changeStatusOfUser,deleteUserByAdmin} = require("../../controllers/admin.controller");


router.post('/forgetPassword',validationMiddleware(forgetPasswordAdmin),forgetPassword)

router.post('/resetPassword/:userId/:token',validationMiddleware(resetPasswordAdmin),resetPassword)

router.put('/updateAdmin',auth.verifyToken, upload.array("profile_image"),validationMiddleware(updateAdminValidation),updateAdmin)

router.get('/getAdminDetails',auth.verifyToken,getAdminDetails)


/// admin only can create manager
router.post("/createManager",auth.verifyToken,validationMiddleware(createmanager),createManager);


//********************** get the list of all manager and developer ******************************* */
router.get("/listAllUser",auth.verifyToken, listAllUsers)

//*********************** admin can block and unblock the user ****** */

router.put("/changeStatusOfUser",auth.verifyToken, validationMiddleware(statusChangeByAdmin),changeStatusOfUser)


//**************************** admin can delete the user *********************** */

router.delete("/deleteUserByAdmin",auth.verifyToken,validationMiddleware(userDeleteByAdmin),deleteUserByAdmin)

module.exports = router;
