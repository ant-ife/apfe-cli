import path from 'path';

export const isLocalPath = templatePath =>
  /^[./]|(^[a-zA-Z]:)/.test(templatePath);

export const getTemplatePath = templatePath =>
  path.isAbsolute(templatePath)
    ? templatePath
    : path.normalize(path.join(process.cwd(), templatePath));
