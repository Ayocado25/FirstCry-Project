'use strict';
require('dotenv').config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long';
process.env.DB_NAME = process.env.DB_NAME || 'daycare_tracker_test';
