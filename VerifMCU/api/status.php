<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

jsonResponse(Extract::getStatus());
