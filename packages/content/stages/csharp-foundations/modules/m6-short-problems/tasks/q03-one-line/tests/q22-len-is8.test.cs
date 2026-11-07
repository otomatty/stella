public class Q22LenIs8Tests
{
    [Theory(DisplayName = "Q22 長さが 8")]
    [InlineData("20260903\n", "Yes\n")]
    [InlineData("123\n", "No\n")]
    [InlineData("abcdefgh\n", "Yes\n")]
    [InlineData("\n", "No\n")]
    public void Q22LenIs8(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q22LenIs8())));
    }
}
