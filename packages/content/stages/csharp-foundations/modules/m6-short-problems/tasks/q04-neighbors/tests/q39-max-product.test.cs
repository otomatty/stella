public class Q39MaxProductTests
{
    [Theory(DisplayName = "Q39 隣の積の最大")]
    [InlineData("4\n3 10 6 20\n", "120\n")]
    [InlineData("2\n3 10\n", "30\n")]
    public void Q39MaxProduct(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q39MaxProduct())));
    }
}
