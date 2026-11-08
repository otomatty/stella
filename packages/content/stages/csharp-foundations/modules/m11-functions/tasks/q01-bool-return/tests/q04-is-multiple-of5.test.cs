public class Q04IsMultipleOf5Tests
{
    [Fact(DisplayName = "Q04 5の倍数か")]
    public void Q04IsMultipleOf5()
    {
        Assert.Equal(true, Answers.Q04IsMultipleOf5(10));
        Assert.Equal(false, Answers.Q04IsMultipleOf5(11));
        Assert.Equal(true, Answers.Q04IsMultipleOf5(0));
    }
}
