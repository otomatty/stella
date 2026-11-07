public class S02PayWithShippingTests
{
    [Theory(DisplayName = "S02 送料")]
    [InlineData("2999\n500\n", "3499\n")]
    [InlineData("3000\n500\n", "3000\n")]
    [InlineData("0\n0\n", "0\n")]
    [InlineData("2999\n0\n", "2999\n")]
    public void S02PayWithShipping(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S02PayWithShipping())));
    }
}
