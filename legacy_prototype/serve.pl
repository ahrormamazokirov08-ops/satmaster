#!/usr/bin/env perl
# ApplyPilot Lightweight Local Static Server
use strict;
use warnings;
use IO::Socket::INET;

my $port = shift || 3000;
my $server = IO::Socket::INET->new(
    LocalPort => $port,
    Type      => SOCK_STREAM,
    Reuse     => 1,
    Listen    => 10
) or die "Cannot create server on port $port: $!\n";

print "ApplyPilot Web Server started at http://localhost:$port/\n";

my %mime_types = (
    html => 'text/html',
    css  => 'text/css',
    js   => 'application/javascript',
    json => 'application/json',
    png  => 'image/png',
    jpg  => 'image/jpeg',
    svg  => 'image/svg+xml',
    ico  => 'image/x-icon'
);

while (my $client = $server->accept()) {
    my $request_line = <$client>;
    next unless $request_line;

    my ($method, $path) = split(' ', $request_line);
    $path = '/' unless $path;
    $path =~ s/\?.*$//; # Remove query params
    $path = '/index.html' if $path eq '/';

    # Sanitize path to prevent directory traversal
    $path =~ s/\.\.//g;
    my $file_path = "." . $path;

    if (-f $file_path) {
        my ($ext) = $file_path =~ /\.([^.]+)$/;
        my $mime = $mime_types{lc($ext || '')} || 'text/plain';

        if (open(my $fh, '<:raw', $file_path)) {
            my $content = do { local $/; <$fh> };
            close($fh);

            print $client "HTTP/1.1 200 OK\r\n";
            print $client "Content-Type: $mime\r\n";
            print $client "Content-Length: " . length($content) . "\r\n";
            print $client "Connection: close\r\n\r\n";
            print $client $content;
        } else {
            send_response($client, 500, "Internal Server Error");
        }
    } else {
        send_response($client, 404, "404 Not Found");
    }

    close($client);
}

sub send_response {
    my ($client, $status, $msg) = @_;
    print $client "HTTP/1.1 $status $msg\r\n";
    print $client "Content-Type: text/plain\r\n";
    print $client "Content-Length: " . length($msg) . "\r\n";
    print $client "Connection: close\r\n\r\n";
    print $client $msg;
}
