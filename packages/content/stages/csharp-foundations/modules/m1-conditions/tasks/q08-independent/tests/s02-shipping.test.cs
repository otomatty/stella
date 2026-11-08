public class S02ShippingTests
{
    [Theory(DisplayName = "S02 箱の送料")]
    [InlineData(2, 400)]
    [InlineData(3, 700)]
    [InlineData(6, 1000)]
    [InlineData(1, 400)]
    [InlineData(5, 700)]
    [InlineData(10, 1000)]
    public void S02Shipping(int w, int expected)
    {
        Assert.Equal(expected, Answers.S02Shipping(w));
    }
}
