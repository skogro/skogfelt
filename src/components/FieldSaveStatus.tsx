import { Typography } from "@mui/material";

type FieldSaveStatusProps = {
  changeExecuting: boolean | null;
  changeError: string | null;
  isDirty: boolean;
  showSave?: boolean;
  marginTop?: number;
  successText?: string;
  loadingText?: string;
  errorText?: string;
};

const FieldSaveStatus = ({
  changeExecuting,
  changeError,
  isDirty,
  showSave = true,
  marginTop = -2,
  successText = "Saved.",
  loadingText = "Saving Change...",
  errorText = "Save failed. Try again.",
}: FieldSaveStatusProps) => {
  if (!showSave) {
    return null;
  }

  return (
    <>
      {changeExecuting === true && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: marginTop, pt: 0, mr: 1, color: "grey" }}>
          {loadingText}
        </Typography>
      )}
      {changeExecuting === false && !changeError && !isDirty && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: marginTop, pt: 0, mr: 1, color: "green" }}>
          {successText}
        </Typography>
      )}
      {changeError && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: marginTop, pt: 0, mr: 1, color: "error.main" }}>
          {errorText}
        </Typography>
      )}
    </>
  );
};

export default FieldSaveStatus;
