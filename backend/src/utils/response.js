export function success(data, message = 'Success') {
  return {
    success: true,
    data,
    message,
  };
}

export function error(message, code = 'ERROR', statusCode = 400) {
  return {
    success: false,
    error: {
      code,
      message,
    },
    statusCode,
  };
}

export function paginated(data, pagination) {
  return {
    success: true,
    data,
    pagination,
  };
}
