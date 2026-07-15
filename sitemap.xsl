<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">

<xsl:output method="html" indent="yes"/>

<xsl:template match="/">

<html>
<head>

<title>NI Group Realty XML Sitemap</title>

<style>
body{
    font-family:Arial,sans-serif;
    background:#f5f7fa;
    margin:40px;
}

h1{
    color:#003366;
}

table{
    width:100%;
    border-collapse:collapse;
}

th{
    background:#003366;
    color:#fff;
    padding:12px;
}

td{
    border:1px solid #ddd;
    padding:12px;
}

tr:nth-child(even){
    background:#f7f7f7;
}

a{
    color:#0066cc;
    text-decoration:none;
}

a:hover{
    text-decoration:underline;
}
</style>

</head>

<body>

<h1>NI Group Realty XML Sitemap</h1>

<p>Total URLs:
<b><xsl:value-of select="count(s:urlset/s:url)"/></b>
</p>

<table>

<tr>
<th>URL</th>
<th>Priority</th>
<th>Frequency</th>
</tr>

<xsl:for-each select="s:urlset/s:url">

<tr>

<td>
<a href="{s:loc}">
<xsl:value-of select="s:loc"/>
</a>
</td>

<td>
<xsl:value-of select="s:priority"/>
</td>

<td>
<xsl:value-of select="s:changefreq"/>
</td>

</tr>

</xsl:for-each>

</table>

</body>

</html>

</xsl:template>

</xsl:stylesheet>