package com.realestate.calc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class RealEstateCalcApplication {

    public static void main(String[] args) {
        SpringApplication.run(RealEstateCalcApplication.class, args);
    }

}