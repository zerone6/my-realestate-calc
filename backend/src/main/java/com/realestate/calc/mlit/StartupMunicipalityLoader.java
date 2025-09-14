package com.realestate.calc.mlit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class StartupMunicipalityLoader {
    private static final Logger log = LoggerFactory.getLogger(StartupMunicipalityLoader.class);
    private final MunicipalityCacheService cacheService;

    public StartupMunicipalityLoader(MunicipalityCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void initializeCache() {
        log.info("Initializing MLIT municipalities cache (XIT002) after app is ready...");
        cacheService.loadOrFetchAll();
    }
}
