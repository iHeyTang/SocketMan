export const autoScroll = (eleId: string) => {
  const logsContainer = document.getElementById(eleId);
  // 在最底端或内容没有充满屏幕时进行自动滚动
  if (
    logsContainer &&
    (logsContainer.scrollHeight === logsContainer.scrollTop ||
      logsContainer.scrollHeight - logsContainer.scrollTop < logsContainer.clientHeight + 100)
  ) {
    setTimeout(() => {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }, 0);
  }
};
