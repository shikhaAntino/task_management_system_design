const Joi = require("joi");
module.exports = {
  logIn: (payload) => {
    const schema = Joi.object({
      email: Joi.string().email().lowercase().required(),
      password: Joi.string().required().min(7),
    });
    return schema.validate(payload);
  },

  createDeveloper: (payload) => {
    const schema = Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().email().lowercase().required(),
      mobile_number: Joi.string().regex(/^[0-9]{10}$/),
    });
    return schema.validate(payload);
  },

  updateData: (payload) => {
    const schema = Joi.object({
      first_name: Joi.string(),
      last_name: Joi.string(),
      email: Joi.string().email().lowercase(),
      mobile_number: Joi.string().regex(/^[0-9]{10}$/),
      password: Joi.string().min(7),
      profile_image: Joi.string(),
      tech_stack: Joi.string(),
    });
    return schema.validate(payload);
  },
};
