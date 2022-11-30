export const uuidValidation = "regex:/^[A-Z0-9]{8}-([A-Z0-9]{4}-){3}[A-Z0-9]{12}$/i";
export const currencyStringValidation = "min:2|max:20";

export const newErrWithCode = (message: string, status = 500, code: number = null) => {
  if (code) {
    return Object.assign(new Error(message), { status: status, error: { code } });
  }
  return Object.assign(new Error(message), { status: status });
};

export const isNumeric = (n: any) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
};
