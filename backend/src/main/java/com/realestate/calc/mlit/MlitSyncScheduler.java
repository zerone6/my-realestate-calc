package com.realestate.calc.mlit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.event.ApplicationReadyEvent;

@Component
public class MlitSyncScheduler {
    private static final Logger log = LoggerFactory.getLogger(MlitSyncScheduler.class);

    private final MlitDbSyncService dbSyncService;

    @Value("${mlit.sync.language:ja}")
    private String language;
    @Value("${mlit.sync.cron:0 0 3 1 * *}")
    private String cron;
    @Value("${mlit.sync.zone:Asia/Tokyo}")
    private String zone;

    public MlitSyncScheduler(MlitDbSyncService dbSyncService) {
        this.dbSyncService = dbSyncService;
    }

    // 서버 기동 시: DB가 완전히 비어있는 경우에만 초기 적재 수행
    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        try {
            if (dbSyncService.isDbEmpty()) {
                log.info("DB empty at startup -> fetching municipalities from MLIT API (one-time init)...");
                dbSyncService.refreshAllFromApi(language);
            } else {
                log.info("DB has data at startup -> skipping initial MLIT fetch.");
            }
        } catch (Exception ex) {
            log.error("Startup MLIT init failed: {}", ex.getMessage());
        }
    }

    // 스케줄러: 매월 1일 실행 (cron/zone은 설정에서 주입)
    @Scheduled(cron = "${mlit.sync.cron:0 0 3 1 * *}", zone = "${mlit.sync.zone:Asia/Tokyo}")
    public void monthlyRefresh() {
        log.info("Running monthly MLIT refresh (cron={}, zone={}, language={}).", cron, zone, language);
        try {
            dbSyncService.refreshAllFromApi(language);
        } catch (Exception ex) {
            log.error("Monthly MLIT refresh failed: {}", ex.getMessage());
        }
    }
}
