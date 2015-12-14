﻿feeder.node.js
===

The QLstats.net feeder is the glue between Quake Live game servers and the QLstats/xonstat website and database.

In its normal mode of operation, it collects match statistics from Quake Live game servers through ZMQ, then transforms and forwards the data to the QLstats HTTP server (submission.py), which insert it in the database.

In the default configuration, it also saves the received JSON data as files for eventual later reprocessing.  
If there is an error while uploading the data to the QLstats HTTP server, a copy of the JSON file is saved in the errors/ folder.

To reprocess files or whole directories you can specify them as command line parameters.  
When started like that, the feeder only loads the .json[.gz] files and does not connect to any game servers.  
When started with the "-e" parameter, it will resend all files from the errors/ folder to the QLstats HTTP server and deletes them on success.

Built-in HTTP server
---
By default the feeder will start a HTTP server on port 8081.  
The default page is a Server Admin Panel that can be used to add and maintain servers in the cfg.json config file.

The HTTP server also provides a few **API URLs**:

/api/jsons/2015-11-24  
returns a list of all match files stored in the 2015-01/24/ folder, without the .json[.gz] extension.

/api/jsons/2015-11-24/00366f62-9f5a-4d7d-a46b-6638fcfcb2f6.json  
returns the requested file in plain-text JSON format  

/api/jsons/2015-11-24/00366f62-9f5a-4d7d-a46b-6638fcfcb2f6.json.gz  
returns the requested file in gzipped JSON format

Connecting to Quake Live Game ZMQ
---
The feeder tries to connect to a server for up to 1 minute. If it cannot establish a connection with it that time, it will wait 5 minutes before retrying again.
During that 1 minute, servers show up with status "connecting" in the Admin Panel. After that minute they show up as "can't connect".

If the connection is immediately closed by the server after it was established, it usually means that the ZMQ password on the server and feeder are different.

The feeder reconnects to all servers which have not sent any events for 15 minutes to work around an issue where QL stops sending data after some extended idle period.

