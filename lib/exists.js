import fs from 'fs';

const exists = type => target => {
  try {
    const status = fs.statSync(target);
    const func = type === 'file' ? status.isFile : status.isDirectory;
    return !!func.call(status);
  } catch (ex) {
    return false;
  }
};

export const existsFile = exists('file');
export const existsDir = exists('dir');
