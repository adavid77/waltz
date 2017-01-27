package com.khartec.waltz.data.survey;

import com.khartec.waltz.common.DateTimeUtilities;
import com.khartec.waltz.common.StringUtilities;
import com.khartec.waltz.model.EntityKind;
import com.khartec.waltz.model.EntityReference;
import com.khartec.waltz.model.HierarchyQueryScope;
import com.khartec.waltz.model.IdSelectionOptions;
import com.khartec.waltz.model.survey.*;
import com.khartec.waltz.schema.tables.records.SurveyRunRecord;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.RecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.Optional;

import static com.khartec.waltz.common.Checks.checkNotNull;
import static com.khartec.waltz.common.StringUtilities.join;
import static com.khartec.waltz.common.StringUtilities.split;
import static com.khartec.waltz.schema.Tables.SURVEY_RUN;

@Repository
public class SurveyRunDao {

    private static final String ID_SEPARATOR = ";";

    private static final RecordMapper<Record, SurveyRun> TO_DOMAIN_MAPPER = r -> {
        SurveyRunRecord record = r.into(SURVEY_RUN);
        return ImmutableSurveyRun.builder()
                .id(record.getId())
                .surveyTemplateId(record.getSurveyTemplateId())
                .name(record.getName())
                .description(record.getDescription())
                .selectionOptions(IdSelectionOptions.mkOpts(
                        EntityReference.mkRef(
                                EntityKind.valueOf(record.getSelectorEntityKind()),
                                record.getSelectorEntityId()),
                        HierarchyQueryScope.valueOf(record.getSelectorHierarchyScope())))
                .involvementKindIds(split(
                        record.getInvolvementKindIds(),
                        ID_SEPARATOR,
                        Long::valueOf))
                .issuedOn(Optional.ofNullable(record.getIssuedOn()).map(Date::toLocalDate))
                .dueDate(Optional.ofNullable(record.getDueDate()).map(Date::toLocalDate))
                .issuanceKind(SurveyIssuanceKind.valueOf(record.getIssuanceKind()))
                .ownerId(record.getOwnerId())
                .contactEmail(record.getContactEmail())
                .status(SurveyRunStatus.valueOf(record.getStatus()))
                .build();
    };


    private final DSLContext dsl;


    @Autowired
    public SurveyRunDao(DSLContext dsl) {
        checkNotNull(dsl, "dsl cannot be null");

        this.dsl = dsl;
    }


    public SurveyRun getById(long id) {
        return dsl.select(SURVEY_RUN.fields())
                .from(SURVEY_RUN)
                .where(SURVEY_RUN.ID.eq(id))
                .fetchOne(TO_DOMAIN_MAPPER);
    }


    public long create(long ownerId, SurveyRunCreateCommand command) {
        checkNotNull(command, "command cannot be null");

        SurveyRunRecord record = dsl.newRecord(SURVEY_RUN);
        record.setSurveyTemplateId(command.surveyTemplateId());
        record.setName(command.name());
        record.setDescription(command.description());
        record.setSelectorEntityKind(command.selectionOptions().entityReference().kind().name());
        record.setSelectorEntityId(command.selectionOptions().entityReference().id());
        record.setSelectorHierarchyScope(command.selectionOptions().scope().name());
        record.setInvolvementKindIds(join(command.involvementKindIds(), ID_SEPARATOR));
        record.setDueDate(command.dueDate().map(Date::valueOf).orElse(null));
        record.setIssuanceKind(command.issuanceKind().name());
        record.setOwnerId(ownerId);
        record.setContactEmail(command.contactEmail().orElse(null));
        record.setStatus(SurveyRunStatus.DRAFT.name());

        record.store();
        return record.getId();
    }


    public int update(long surveyRunId, SurveyRunChangeCommand command) {
        checkNotNull(command, "command cannot be null");

        return dsl.update(SURVEY_RUN)
                .set(SURVEY_RUN.NAME, command.name())
                .set(SURVEY_RUN.DESCRIPTION, command.description())
                .set(SURVEY_RUN.SELECTOR_ENTITY_KIND, command.selectionOptions().entityReference().kind().name())
                .set(SURVEY_RUN.SELECTOR_ENTITY_ID, command.selectionOptions().entityReference().id())
                .set(SURVEY_RUN.SELECTOR_HIERARCHY_SCOPE, command.selectionOptions().scope().name())
                .set(SURVEY_RUN.INVOLVEMENT_KIND_IDS, StringUtilities.join(command.involvementKindIds(), ID_SEPARATOR))
                .set(SURVEY_RUN.DUE_DATE, command.dueDate().map(Date::valueOf).orElse(null))
                .set(SURVEY_RUN.ISSUANCE_KIND, command.issuanceKind().name())
                .set(SURVEY_RUN.CONTACT_EMAIL, command.contactEmail().orElse(null))
                .where(SURVEY_RUN.ID.eq(surveyRunId))
                .execute();
    }


    public int updateStatus(long surveyRunId, SurveyRunStatus newStatus) {
        checkNotNull(newStatus, "newStatus cannot be null");

        return dsl.update(SURVEY_RUN)
                .set(SURVEY_RUN.STATUS, newStatus.name())
                .where(SURVEY_RUN.ID.eq(surveyRunId))
                .execute();
    }


    public int issue(long surveyRunId) {
        return dsl.update(SURVEY_RUN)
                .set(SURVEY_RUN.STATUS, SurveyRunStatus.ISSUED.name())
                .set(SURVEY_RUN.ISSUED_ON, java.sql.Date.valueOf(DateTimeUtilities.nowUtc().toLocalDate()))
                .where(SURVEY_RUN.ID.eq(surveyRunId))
                .execute();
    }
}
