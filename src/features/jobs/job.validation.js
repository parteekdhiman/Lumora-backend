import Joi from 'joi';

export const createJobSchema = Joi.object({
  title: Joi.string().required(),
  company: Joi.string().required(),
  location: Joi.string().required(),
  type: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship').required(),
  salary: Joi.string().required(),
  experienceLevel: Joi.string().valid('Entry Level', 'Mid Level', 'Senior Level', 'Executive').required(),
  description: Joi.string().required(),
  tags: Joi.array().items(Joi.string()),
  responsibilities: Joi.array().items(Joi.string()),
  requirements: Joi.array().items(Joi.string()),
  benefits: Joi.array().items(Joi.string()),
});
