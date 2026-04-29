export const extractFileId = (url) => {
  const match = url.match(/\/d\/(.*?)\//);
  return match ? match[1] : null;
};

export const convertToDirectDownload = (fileId) => {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};
