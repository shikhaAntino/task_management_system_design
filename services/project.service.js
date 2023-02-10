const Mongoose = require("mongoose");
const Project = require("../models/project.model");

const getOneProject = async (params) => {
  return Project.findOne(params);
};
const getAllProject = async (query) => {
  return Project.find(query);
};

const getProjectById = async (id) => {
  return Project.findById(id);
};

const getProjectByIdAndUpdate = async (id, update) => {
  return Project.findOneAndUpdate(id, update, { new: true });
};

const createProject = async (data) => {
  return Project.create(data);
};
const countProject = async () => {
  return Project.countDocuments();
};

// const getProjectByIdAndUpdate = async(id,update) =>{
//   return Project.findByIdAndUpdate(id,update,{new:true});
// }

module.exports = {
  getOneProject,
  getAllProject,
  getProjectById,
  getProjectByIdAndUpdate,
  createProject,
  countProject,
  getProjectByIdAndUpdate
};
