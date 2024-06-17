# Video Editor

Video handling application for storing, resizing, extracting audio and creation of thumbnail from videos.

built using nodejs, and the Cpeak framework from npm, mostly for its lightweight and simplicity. the video operations such as resizing, thumnail creation and audio extraction were accomplished using the FFmpeg an open source C based application widely used for this purpose.

other features to make the application resilient and fast include clustering, and compression using the node modules.

To deploy this application to production I would refactor it to use express and include a DBMS for user data persistence such as user personal information.

videos can also be compressed using lossy algorithm for better memory management.