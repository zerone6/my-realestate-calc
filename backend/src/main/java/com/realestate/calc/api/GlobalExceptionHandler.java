package com.realestate.calc.api;

import com.realestate.calc.exception.AuthRequiredException;
import com.realestate.calc.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthRequiredException.class)
    public ResponseEntity<ApiErrorResponse> handleAuth(AuthRequiredException ex) {
        ApiErrorResponse body = new ApiErrorResponse();
        body.setStatus(HttpStatus.UNAUTHORIZED.value());
        body.setCode("NEED_LOGIN");
        body.setMessage("로그인이 필요합니다");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(ValidationException ex) {
        ApiErrorResponse body = new ApiErrorResponse();
        body.setStatus(HttpStatus.BAD_REQUEST.value());
        body.setCode("VALIDATION_ERROR");
        body.setMessage(ex.getMessage());
        body.setField(ex.getField());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        ApiErrorResponse body = new ApiErrorResponse();
        body.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.setCode("INTERNAL_ERROR");
        body.setMessage("서버 오류가 발생했습니다");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
