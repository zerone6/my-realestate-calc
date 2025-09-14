package com.realestate.calc.exception;

public class AuthRequiredException extends RuntimeException {
    public AuthRequiredException() {
        super("NEED_LOGIN");
    }
}
