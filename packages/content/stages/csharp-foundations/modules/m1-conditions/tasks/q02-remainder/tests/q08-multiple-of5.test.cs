public class Q08MultipleOf5Tests
{
    [Theory(DisplayName = "Q08 5の倍数")]
    [InlineData(10, "Yes")]
    [InlineData(11, "No")]
    [InlineData(0, "Yes")]
    public void Q08MultipleOf5(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q08MultipleOf5(n));
    }
}
