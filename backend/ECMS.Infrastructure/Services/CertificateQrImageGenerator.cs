using QRCoder;

namespace ECMS.Infrastructure.Services;

public static class CertificateQrImageGenerator
{
    public static byte[] GeneratePng(string payload, int pixelsPerModule = 5)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        return png.GetGraphic(pixelsPerModule);
    }
}
