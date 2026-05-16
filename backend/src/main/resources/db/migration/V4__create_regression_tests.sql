CREATE TABLE regression_tests (
    id               UUID        PRIMARY KEY,
    input            TEXT,
    expected_failure TEXT,
    type             TEXT,
    created_at       TIMESTAMP WITH TIME ZONE
);
